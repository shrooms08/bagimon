import { NextResponse, type NextRequest } from 'next/server';
import { BagimonRepository } from '@bagimon/db';
import { fetchCreators, getPrimaryCreator } from '@bagimon/bags-api';
import { getServiceSupabase } from '../../../../../lib/supabase';
import { verifyHolderSignature } from '../../../../../lib/interaction-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  wallet?: unknown;
  signature?: unknown;
  message?: unknown;
  nonceToken?: unknown;
}

function symbolOf(sym: string | null): string {
  return sym ? `$${sym}` : 'this coin';
}

// Creator-verified ownership claim. The wallet is proven by the ed25519
// signature (never trusted from the body). On success we set owner_wallet —
// an ownership record only. No custody, no funds, no on-chain writes.
export async function POST(
  req: NextRequest,
  { params }: { params: { bagimonId: string } },
): Promise<Response> {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid JSON' }, { status: 400 });
  }
  const { wallet, signature, message, nonceToken } = body;
  if (
    typeof wallet !== 'string' ||
    typeof signature !== 'string' ||
    typeof message !== 'string' ||
    typeof nonceToken !== 'string'
  ) {
    return NextResponse.json(
      { ok: false, reason: 'missing wallet, signature, message, or nonceToken' },
      { status: 400 },
    );
  }

  const repo = new BagimonRepository(getServiceSupabase());
  const bagimon = await repo.findById(params.bagimonId);
  if (!bagimon) return NextResponse.json({ ok: false, reason: 'not found' }, { status: 404 });

  // 1. Verify the signature and that the nonce was minted for claiming.
  const sig = await verifyHolderSignature({
    bagimonId: params.bagimonId,
    nonceToken,
    message,
    wallet,
    signature,
  });
  if (!sig.ok) {
    return NextResponse.json({ ok: false, reason: sig.reason }, { status: 401 });
  }
  if (sig.purpose !== 'claim') {
    return NextResponse.json({ ok: false, reason: 'wrong nonce purpose' }, { status: 401 });
  }

  // 2. Resolve ownership state before the (possibly slow) creator lookup.
  if (bagimon.owner_wallet) {
    if (bagimon.owner_wallet === wallet) {
      return NextResponse.json({ ok: true, claimed: true, owner: wallet, alreadyYours: true });
    }
    return NextResponse.json(
      {
        ok: false,
        reason: 'already_claimed',
        message: 'This Bagimon has already been claimed.',
      },
      { status: 200 },
    );
  }

  // 3. Determine the coin's primary creator (live; fall back to stored wallet).
  let creatorWallet: string | null = null;
  try {
    const creators = await fetchCreators(bagimon.coin_mint);
    creatorWallet = creators ? (getPrimaryCreator(creators)?.wallet ?? null) : null;
  } catch {
    creatorWallet = null;
  }
  if (!creatorWallet) creatorWallet = bagimon.creator_wallet ?? null;

  if (!creatorWallet) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'creator_unknown',
        message: "We couldn't verify this coin's creator right now. Try again later.",
      },
      { status: 200 },
    );
  }

  // 4. Only the primary creator may claim (v1).
  if (wallet !== creatorWallet) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'not_creator',
        message: `Only the creator of ${symbolOf(bagimon.coin_symbol)} can claim this Bagimon.`,
      },
      { status: 200 },
    );
  }

  // 5. Record the claim (guarded; handles the concurrent-claim race).
  const claimed = await repo.claim(params.bagimonId, wallet);
  if (claimed) {
    return NextResponse.json({ ok: true, claimed: true, owner: wallet });
  }
  const fresh = await repo.findById(params.bagimonId);
  if (fresh?.owner_wallet === wallet) {
    return NextResponse.json({ ok: true, claimed: true, owner: wallet, alreadyYours: true });
  }
  return NextResponse.json(
    { ok: false, reason: 'already_claimed', message: 'This Bagimon has already been claimed.' },
    { status: 200 },
  );
}
