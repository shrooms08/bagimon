import { describe, expect, it } from 'vitest';
import { BagimonParentsRepository } from '../repositories/bagimon-parents.js';
import type { BagimonSupabaseClient } from '../client.js';

interface Captured {
  table: string;
  op: 'insert' | 'select';
  payload?: unknown;
}

function makeMockClient(opts: { latestSnapshot?: string | null; ranked?: unknown[] } = {}): {
  client: BagimonSupabaseClient;
  captured: Captured[];
} {
  const captured: Captured[] = [];
  const ranked = opts.ranked ?? [];
  const latest = opts.latestSnapshot ?? null;

  let selectStage = 0; // 1 = latest snapshot probe, 2 = ranked fetch
  const from = (table: string) => ({
    insert(payload: unknown) {
      captured.push({ table, op: 'insert', payload });
      return Promise.resolve({ error: null });
    },
    select() {
      captured.push({ table, op: 'select' });
      selectStage += 1;
      const stage = selectStage;
      const builder = {
        eq: () => builder,
        order: () => builder,
        limit: async () => {
          if (stage === 1) {
            return {
              data: latest ? [{ snapshot_at: latest }] : [],
              error: null,
            };
          }
          return { data: ranked, error: null };
        },
        // No `await select()` paths in this repo, but include `then` for safety.
        then: (cb: (v: { data: unknown[]; error: null }) => unknown) =>
          cb({ data: ranked, error: null }),
      };
      return builder;
    },
  });

  return {
    client: { from } as unknown as BagimonSupabaseClient,
    captured,
  };
}

describe('BagimonParentsRepository.snapshotParents', () => {
  it('inserts one row per holder with shared snapshot_at and rank 1..N', async () => {
    const { client, captured } = makeMockClient();
    const repo = new BagimonParentsRepository(client);
    const at = new Date('2026-05-21T12:00:00Z');
    await repo.snapshotParents({
      bagimonId: 'bg1',
      snapshotAt: at,
      holders: [
        { walletAddress: 'wA', holdingAmount: 100, holdingPercentOfSupply: 50 },
        { walletAddress: 'wB', holdingAmount: 60, holdingPercentOfSupply: 30 },
        { walletAddress: 'wC', holdingAmount: 40 },
      ],
    });
    const insert = captured.find((c) => c.op === 'insert');
    expect(insert).toBeDefined();
    const rows = insert?.payload as Array<{
      bagimon_id: string;
      rank: number;
      wallet_address: string;
      snapshot_at: string;
      holding_amount: number;
      holding_percent_of_supply: number | null;
    }>;
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ rank: 1, wallet_address: 'wA', holding_percent_of_supply: 50 });
    expect(rows[1]).toMatchObject({ rank: 2, wallet_address: 'wB' });
    expect(rows[2]).toMatchObject({ rank: 3, wallet_address: 'wC', holding_percent_of_supply: null });
    expect(new Set(rows.map((r) => r.snapshot_at))).toEqual(new Set([at.toISOString()]));
  });

  it('is a no-op when there are zero holders', async () => {
    const { client, captured } = makeMockClient();
    const repo = new BagimonParentsRepository(client);
    await repo.snapshotParents({ bagimonId: 'bg1', snapshotAt: new Date(), holders: [] });
    expect(captured.filter((c) => c.op === 'insert')).toHaveLength(0);
  });

  it('treats each call as a NEW snapshot (re-calling with same time inserts again)', async () => {
    // Spec note: idempotency is the worker's responsibility, not the repo's.
    const { client, captured } = makeMockClient();
    const repo = new BagimonParentsRepository(client);
    const at = new Date('2026-05-21T12:00:00Z');
    const holders = [{ walletAddress: 'wA', holdingAmount: 1 }];
    await repo.snapshotParents({ bagimonId: 'bg1', snapshotAt: at, holders });
    await repo.snapshotParents({ bagimonId: 'bg1', snapshotAt: at, holders });
    expect(captured.filter((c) => c.op === 'insert')).toHaveLength(2);
  });
});

describe('BagimonParentsRepository.getLatestParents', () => {
  it('returns empty array when no snapshots exist', async () => {
    const { client } = makeMockClient({ latestSnapshot: null });
    const repo = new BagimonParentsRepository(client);
    const out = await repo.getLatestParents('bg1');
    expect(out).toEqual([]);
  });

  it('returns the ranked rows for the most recent snapshot', async () => {
    const sample = [
      { id: 'r1', bagimon_id: 'bg1', wallet_address: 'wA', rank: 1, holding_amount: 100, snapshot_at: '2026-05-21T12:00:00Z' },
      { id: 'r2', bagimon_id: 'bg1', wallet_address: 'wB', rank: 2, holding_amount: 50, snapshot_at: '2026-05-21T12:00:00Z' },
    ];
    const { client } = makeMockClient({
      latestSnapshot: '2026-05-21T12:00:00Z',
      ranked: sample,
    });
    const repo = new BagimonParentsRepository(client);
    const out = await repo.getLatestParents('bg1');
    expect(out).toHaveLength(2);
    expect(out[0]?.rank).toBe(1);
    expect(out[1]?.wallet_address).toBe('wB');
  });
});
