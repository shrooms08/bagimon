import { NextResponse, type NextRequest } from 'next/server';
import { BagimonRepository, createBagimon, NotABagsCoinError } from '@bagimon/db';
import { getServiceSupabase } from '../../../../lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  coinMint?: unknown;
}

// Loose base58 mint check — same shape the bot uses (32–44 base58 chars).
const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Self-serve web spawn. Anyone can look up a Bags coin mint and, if no Bagimon
// exists yet, create one. Lazy: nothing is spawned until someone asks for it.
export async function POST(req: NextRequest): Promise<Response> {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid JSON' }, { status: 400 });
  }

  const coinMint = typeof body.coinMint === 'string' ? body.coinMint.trim() : '';
  if (!MINT_RE.test(coinMint)) {
    return NextResponse.json(
      { ok: false, reason: 'invalid_mint', message: "That doesn't look like a Solana mint address." },
      { status: 400 },
    );
  }

  const repo = new BagimonRepository(getServiceSupabase());

  // Already spawned (by anyone, via web or Discord)? Send them to its Petdex.
  const existing = await repo.findByMint(coinMint);
  if (existing) {
    return NextResponse.json({ ok: true, id: existing.id, existed: true });
  }

  let bagimon;
  try {
    bagimon = await createBagimon(repo, coinMint, { createdVia: 'web' });
  } catch (err) {
    if (err instanceof NotABagsCoinError) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'not_bags',
          message: 'That mint isn’t a Bags coin. Bagimon only works for coins launched on bags.fm.',
        },
        { status: 400 },
      );
    }
    // A race can lose the partial-unique check — recover by returning the winner.
    const raced = await repo.findByMint(coinMint);
    if (raced) return NextResponse.json({ ok: true, id: raced.id, existed: true });
    throw err;
  }

  return NextResponse.json({ ok: true, id: bagimon.id, existed: false });
}
