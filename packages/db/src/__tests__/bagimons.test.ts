import { describe, expect, it } from 'vitest';
import { BagimonRepository } from '../repositories/bagimons.js';
import type { BagimonSupabaseClient } from '../client.js';
import type { Bagimon } from '../types.js';

interface Captured {
  table: string;
  op: 'insert' | 'update' | 'select';
  payload?: unknown;
}

interface MockOptions {
  duplicateOnInsert?: boolean;
  existing?: Bagimon | null;
  failTransitionInsert?: boolean;
}

function makeBagimon(overrides: Partial<Bagimon> = {}): Bagimon {
  const now = new Date().toISOString();
  return {
    id: 'bg-1',
    discord_server_id: 'srv-1',
    discord_server_name: 'test',
    coin_mint: 'mint-1',
    coin_symbol: null,
    coin_name: null,
    current_mood: 'happy',
    is_alive: true,
    born_at: now,
    died_at: null,
    last_activity_at: now,
    spawned_by_discord_user_id: 'user-1',
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
    ...overrides,
  };
}

function makeMockClient(options: MockOptions = {}): {
  client: BagimonSupabaseClient;
  captured: Captured[];
} {
  const captured: Captured[] = [];
  const existing = options.existing ?? null;

  const fromHandler = (table: string) => ({
    insert(payload: unknown) {
      captured.push({ table, op: 'insert', payload });
      if (table === 'bagimons' && options.duplicateOnInsert) {
        return {
          select: () => ({
            single: async () => ({
              data: null,
              error: { code: '23505', message: 'duplicate key' },
            }),
          }),
        };
      }
      if (table === 'mood_transitions' && options.failTransitionInsert) {
        return Promise.resolve({ error: { message: 'transition insert failed' } });
      }
      if (table === 'bagimons') {
        return {
          select: () => ({
            single: async () => ({ data: makeBagimon(), error: null }),
          }),
        };
      }
      return Promise.resolve({ error: null });
    },
    update(payload: unknown) {
      captured.push({ table, op: 'update', payload });
      const terminal = {
        select: () => ({
          single: async () => ({
            data: makeBagimon({ current_mood: 'sick' }),
            error: null,
          }),
        }),
        then: (onResolve: (v: { error: null }) => unknown) => onResolve({ error: null }),
        eq: () => terminal,
      };
      return { eq: () => terminal };
    },
    select() {
      captured.push({ table, op: 'select' });
      const inner = {
        eq: () => inner,
        maybeSingle: async () => ({ data: existing, error: null }),
        order: async () => ({ data: existing ? [existing] : [], error: null }),
        then: (onResolve: (v: { data: Bagimon[]; error: null }) => unknown) =>
          onResolve({ data: existing ? [existing] : [], error: null }),
      };
      return { eq: () => inner };
    },
  });

  const client = {
    from: fromHandler,
  } as unknown as BagimonSupabaseClient;

  return { client, captured };
}

describe('BagimonRepository.spawn', () => {
  it('inserts bagimon and logs spawn transition', async () => {
    const { client, captured } = makeMockClient();
    const repo = new BagimonRepository(client);
    const result = await repo.spawn({
      discord_server_id: 'srv-1',
      coin_mint: 'mint-1',
      spawned_by_discord_user_id: 'user-1',
    });

    expect(result.id).toBe('bg-1');
    expect(captured).toHaveLength(2);
    expect(captured[0]?.table).toBe('bagimons');
    expect(captured[0]?.op).toBe('insert');
    expect(captured[1]?.table).toBe('mood_transitions');
    expect(captured[1]?.payload).toMatchObject({
      from_mood: null,
      to_mood: 'happy',
      trigger_reason: 'spawn',
    });
  });

  it('throws a descriptive error on duplicate', async () => {
    const { client } = makeMockClient({ duplicateOnInsert: true });
    const repo = new BagimonRepository(client);
    await expect(
      repo.spawn({
        discord_server_id: 'srv-1',
        coin_mint: 'mint-1',
        spawned_by_discord_user_id: 'user-1',
      }),
    ).rejects.toThrow(/already exists/);
  });
});

describe('BagimonRepository death methods', () => {
  it('markDead writes is_alive=false plus final snapshot, scoped to alive rows', async () => {
    const { client, captured } = makeMockClient();
    const repo = new BagimonRepository(client);
    await repo.markDead('bg-1', { mood: 'dying', priceUsd: 0.001, volume24hUsd: 42 });
    const update = captured.find((c) => c.table === 'bagimons' && c.op === 'update');
    expect(update?.payload).toMatchObject({
      is_alive: false,
      final_mood: 'dying',
      final_price_usd: 0.001,
      final_volume24h_usd: 42,
    });
  });

  it('markDead is idempotent (second call is a no-op against is_alive=true filter)', async () => {
    const { client } = makeMockClient();
    const repo = new BagimonRepository(client);
    await repo.markDead('bg-1', { mood: 'dying', priceUsd: null, volume24hUsd: null });
    await expect(
      repo.markDead('bg-1', { mood: 'dying', priceUsd: null, volume24hUsd: null }),
    ).resolves.toBeUndefined();
  });

  it('markDeathAnnounced flips death_announced', async () => {
    const { client, captured } = makeMockClient();
    const repo = new BagimonRepository(client);
    await repo.markDeathAnnounced('bg-1');
    const update = captured.find((c) => c.table === 'bagimons' && c.op === 'update');
    expect(update?.payload).toMatchObject({ death_announced: true });
  });

  it('findUnannouncedDeaths returns the rows surfaced by the mock', async () => {
    const dead = makeBagimon({ is_alive: false, death_announced: false });
    const { client } = makeMockClient({ existing: dead });
    const repo = new BagimonRepository(client);
    const out = await repo.findUnannouncedDeaths();
    expect(out).toHaveLength(1);
    expect(out[0]?.is_alive).toBe(false);
  });
});

describe('BagimonRepository.updateMood', () => {
  it('updates mood and logs transition with prior mood', async () => {
    const { client, captured } = makeMockClient({ existing: makeBagimon() });
    const repo = new BagimonRepository(client);
    const result = await repo.updateMood('bg-1', 'sick', 'sell_pressure');

    expect(result.current_mood).toBe('sick');
    const transition = captured.find((c) => c.table === 'mood_transitions');
    expect(transition?.payload).toMatchObject({
      bagimon_id: 'bg-1',
      from_mood: 'happy',
      to_mood: 'sick',
      trigger_reason: 'sell_pressure',
    });
  });
});
