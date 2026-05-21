import { describe, expect, it } from 'vitest';
import { resolveBagimon } from '../lib/resolve-bagimon.js';
import type { Bagimon, BagimonRepository } from '@bagimon/db';

function bagimon(mint: string): Bagimon {
  const now = new Date().toISOString();
  return {
    id: `id-${mint}`,
    discord_server_id: 'srv',
    discord_server_name: null,
    coin_mint: mint,
    coin_symbol: null,
    coin_name: null,
    current_mood: 'happy',
    is_alive: true,
    born_at: now,
    died_at: null,
    last_activity_at: now,
    spawned_by_discord_user_id: 'user',
    created_at: now,
    updated_at: now,
    last_stats_at: null,
    last_price_usd: null,
    last_volume24h_usd: null,
    last_price_change_24h_pct: null,
    death_announced: false,
    final_mood: null,
    final_price_usd: null,
    final_volume24h_usd: null,
    lifetime_fees_lamports: null,
    lifetime_fees_sol: null,
    creator_provider: null,
    creator_username: null,
    creator_provider_username: null,
    creator_wallet: null,
    creator_pfp: null,
    creator_royalty_bps: null,
    bags_synced_at: null,
    bags_sync_error: null,
  };
}

function repoFake(opts: { byMint?: Bagimon | null; byServer?: Bagimon[] }): BagimonRepository {
  return {
    findByServerAndMint: async () => opts.byMint ?? null,
    findByServer: async () => opts.byServer ?? [],
  } as unknown as BagimonRepository;
}

describe('resolveBagimon', () => {
  it('explicit mint returns found when present', async () => {
    const b = bagimon('M1');
    const res = await resolveBagimon(repoFake({ byMint: b }), 'srv', 'M1');
    expect(res).toEqual({ kind: 'found', bagimon: b });
  });

  it('explicit mint returns none when absent', async () => {
    const res = await resolveBagimon(repoFake({ byMint: null }), 'srv', 'M1');
    expect(res.kind).toBe('none');
  });

  it('no mint, exactly one server bagimon → found', async () => {
    const b = bagimon('M1');
    const res = await resolveBagimon(repoFake({ byServer: [b] }), 'srv', null);
    expect(res).toEqual({ kind: 'found', bagimon: b });
  });

  it('no mint, multiple → ambiguous with all listed', async () => {
    const a = bagimon('M1');
    const b = bagimon('M2');
    const res = await resolveBagimon(repoFake({ byServer: [a, b] }), 'srv', null);
    expect(res.kind).toBe('ambiguous');
    if (res.kind === 'ambiguous') {
      expect(res.bagimons).toHaveLength(2);
    }
  });

  it('no mint, none → none', async () => {
    const res = await resolveBagimon(repoFake({ byServer: [] }), 'srv', null);
    expect(res.kind).toBe('none');
  });
});
