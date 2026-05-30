import { NextResponse, type NextRequest } from 'next/server';
import { InteractionsRepository, BagimonRepository } from '@bagimon/db';
import { getServiceSupabase } from '../../../../../lib/supabase';
import { verifySession, SESSION_COOKIE } from '../../../../../lib/interaction-auth';
import { COOLDOWN_MS, reactionLine } from '../../../../../lib/interaction-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  action?: unknown;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { bagimonId: string } },
): Promise<Response> {
  // 1. Session — wallet comes ONLY from the verified cookie, never the body.
  const session = await verifySession(
    req.cookies.get(SESSION_COOKIE)?.value,
    params.bagimonId,
  );
  if (!session) {
    return NextResponse.json({ ok: false, reason: 'not_verified' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid JSON' }, { status: 400 });
  }
  const action = body.action;
  if (action !== 'feed' && action !== 'pet') {
    return NextResponse.json({ ok: false, reason: 'action must be feed or pet' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const bagimons = new BagimonRepository(supabase);
  const interactions = new InteractionsRepository(supabase);

  const bagimon = await bagimons.findById(params.bagimonId);
  if (!bagimon) return NextResponse.json({ ok: false, reason: 'not found' }, { status: 404 });

  // 4. Can't interact with a dead Bagimon.
  if (!bagimon.is_alive) {
    return NextResponse.json(
      { ok: false, reason: 'dead', message: 'This Bagimon has passed. 🕊️' },
      { status: 200 },
    );
  }

  // 3. Per-wallet, per-action cooldown.
  const last = await interactions.lastWebActionAt(params.bagimonId, session.wallet, action);
  if (last) {
    const nextAvailableAt = last.getTime() + COOLDOWN_MS;
    if (Date.now() < nextAvailableAt) {
      return NextResponse.json(
        { ok: false, reason: 'cooldown', nextAvailableAt: new Date(nextAvailableAt).toISOString() },
        { status: 200 },
      );
    }
  }

  // 5. Record in the unified interactions table.
  const response = reactionLine(action);
  await interactions.recordWeb({
    bagimonId: params.bagimonId,
    actorWallet: session.wallet,
    action,
    responseText: response,
  });

  // 6. Apply the cosmetic effect (counters + last-fed). Does NOT affect the
  // on-chain death clock — feeding is an engagement signal only.
  const counters = await bagimons.applyInteraction(params.bagimonId, action, session.wallet);

  return NextResponse.json({
    ok: true,
    action,
    response,
    newState: {
      timesFed: counters.times_fed,
      timesPet: counters.times_pet,
      lastFedBy: action === 'feed' ? session.wallet : bagimon.last_fed_by,
      nextAvailableAt: new Date(Date.now() + COOLDOWN_MS).toISOString(),
    },
  });
}
