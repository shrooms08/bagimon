import 'server-only';
import { randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Phase 7.4 holder-interaction auth. This gates a FREE game action, not money —
// so the goal is "verify the signature properly + prevent trivial replay",
// not bank-grade auth. Everything is stateless (no nonce table): the nonce is
// itself a short-lived signed JWT, and the session is a signed JWT cookie.

const NONCE_TTL = '5m';
const SESSION_TTL_SECONDS = 30 * 60;
export const SESSION_COOKIE = 'bagimon_interact';

function secret(): Uint8Array {
  const s = process.env.INTERACTION_JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error('INTERACTION_JWT_SECRET must be set (>=16 chars) for holder interactions');
  }
  return new TextEncoder().encode(s);
}

// The exact text the wallet is asked to sign. Deterministically rebuilt from
// nonce claims on the server so a holder can only ever sign our message.
export function buildSignMessage(claims: {
  bagimonId: string;
  nonce: string;
  issuedAt: string;
}): string {
  return [
    'Bagimon — prove you hold this coin to care for your Bagimon.',
    '',
    'This is a free signature. It does not approve any transaction or spend.',
    '',
    `Bagimon: ${claims.bagimonId}`,
    `Nonce: ${claims.nonce}`,
    `Issued: ${claims.issuedAt}`,
  ].join('\n');
}

export interface IssuedNonce {
  nonceToken: string;
  message: string;
}

export async function issueNonce(bagimonId: string): Promise<IssuedNonce> {
  const nonce = randomBytes(16).toString('hex');
  const issuedAt = new Date().toISOString();
  const message = buildSignMessage({ bagimonId, nonce, issuedAt });
  const nonceToken = await new SignJWT({ typ: 'nonce', bagimonId, nonce, issuedAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(NONCE_TTL)
    .sign(secret());
  return { nonceToken, message };
}

export interface VerifyInput {
  bagimonId: string;
  nonceToken: string;
  message: string;
  wallet: string;
  signature: string; // base58
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function verifyHolderSignature(input: VerifyInput): Promise<VerifyResult> {
  let claims: { typ?: unknown; bagimonId?: unknown; nonce?: unknown; issuedAt?: unknown };
  try {
    const { payload } = await jwtVerify(input.nonceToken, secret());
    claims = payload as typeof claims;
  } catch {
    return { ok: false, reason: 'nonce expired or invalid — refresh and try again' };
  }
  if (claims.typ !== 'nonce' || claims.bagimonId !== input.bagimonId) {
    return { ok: false, reason: 'nonce does not match this Bagimon' };
  }
  if (typeof claims.nonce !== 'string' || typeof claims.issuedAt !== 'string') {
    return { ok: false, reason: 'malformed nonce' };
  }

  // Reconstruct the message from trusted claims; the client-submitted message
  // must match exactly, so a holder can never sign attacker-chosen text.
  const expected = buildSignMessage({
    bagimonId: input.bagimonId,
    nonce: claims.nonce,
    issuedAt: claims.issuedAt,
  });
  if (expected !== input.message) {
    return { ok: false, reason: 'signed message mismatch' };
  }

  let valid = false;
  try {
    valid = nacl.sign.detached.verify(
      new TextEncoder().encode(expected),
      bs58.decode(input.signature),
      bs58.decode(input.wallet),
    );
  } catch {
    return { ok: false, reason: 'malformed wallet or signature' };
  }
  if (!valid) return { ok: false, reason: 'signature verification failed' };
  return { ok: true };
}

export async function issueSession(wallet: string, bagimonId: string): Promise<string> {
  return new SignJWT({ typ: 'session', wallet, bagimonId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export interface Session {
  wallet: string;
  bagimonId: string;
}

export async function verifySession(
  token: string | undefined,
  bagimonId: string,
): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.typ !== 'session') return null;
    if (payload.bagimonId !== bagimonId) return null;
    if (typeof payload.wallet !== 'string') return null;
    return { wallet: payload.wallet, bagimonId };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
