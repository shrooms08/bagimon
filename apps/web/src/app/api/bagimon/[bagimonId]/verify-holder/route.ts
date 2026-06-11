import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase } from '../../../../../lib/supabase';
import {
  verifyHolderSignature,
  issueSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from '../../../../../lib/interaction-auth';
import { getTokenBalance } from '../../../../../lib/helius-balance';
import { MIN_HOLD_AMOUNT } from '../../../../../lib/interaction-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  wallet?: unknown;
  signature?: unknown;
  message?: unknown;
  nonceToken?: unknown;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { bagimonId: string } },
): Promise<Response> {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ verified: false, reason: 'invalid JSON' }, { status: 400 });
  }
  const { wallet, signature, message, nonceToken } = body;
  if (
    typeof wallet !== 'string' ||
    typeof signature !== 'string' ||
    typeof message !== 'string' ||
    typeof nonceToken !== 'string'
  ) {
    return NextResponse.json(
      { verified: false, reason: 'missing wallet, signature, message, or nonceToken' },
      { status: 400 },
    );
  }

  const supabase = getSupabase();
  const { data: bagimon, error } = await supabase
    .from('bagimons')
    .select('id, coin_mint, coin_symbol, is_alive')
    .eq('id', params.bagimonId)
    .maybeSingle();
  if (error) return NextResponse.json({ verified: false, reason: error.message }, { status: 500 });
  if (!bagimon) return NextResponse.json({ verified: false, reason: 'not found' }, { status: 404 });

  const sig = await verifyHolderSignature({
    bagimonId: params.bagimonId,
    nonceToken,
    message,
    wallet,
    signature,
  });
  if (!sig.ok) {
    return NextResponse.json({ verified: false, reason: sig.reason }, { status: 401 });
  }
  if (sig.purpose !== 'interact') {
    return NextResponse.json({ verified: false, reason: 'wrong nonce purpose' }, { status: 401 });
  }

  let balance: number;
  try {
    balance = await getTokenBalance(wallet, bagimon.coin_mint);
  } catch (e) {
    return NextResponse.json(
      { verified: false, reason: `balance check failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }

  if (balance <= MIN_HOLD_AMOUNT) {
    const sym = bagimon.coin_symbol ? `$${bagimon.coin_symbol}` : 'this coin';
    return NextResponse.json(
      { verified: false, reason: `not_holder`, message: `You need to hold ${sym} to interact.`, balance },
      { status: 200 },
    );
  }

  const token = await issueSession(wallet, params.bagimonId);
  const res = NextResponse.json({ verified: true, balance });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: `/`,
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
