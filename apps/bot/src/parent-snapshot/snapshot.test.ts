import { describe, expect, it, vi } from 'vitest';
import type { Bagimon, BagimonParentsRepository, BagimonRepository } from '@bagimon/db';
import type { HolderDataService } from '@bagimon/holder-data';
import { ParentSnapshotWorker } from './index.js';

function makeBagimon(overrides: Partial<Bagimon> = {}): Bagimon {
  return {
    id: 'bg1',
    discord_server_id: 'srv',
    discord_server_name: null,
    coin_mint: 'MintA',
    coin_symbol: 'AAA',
    coin_name: null,
    current_mood: 'happy',
    is_alive: true,
    born_at: new Date().toISOString(),
    died_at: null,
    last_activity_at: new Date().toISOString(),
    spawned_by_discord_user_id: 'u',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
    times_fed: 0,
    times_pet: 0,
    last_fed_at: null,
    last_fed_by: null,
    last_interaction_at: null,
    created_via: 'discord',
    owner_wallet: null,
    claimed_at: null,
    ...overrides,
  };
}

describe('ParentSnapshotWorker.runOnce', () => {
  it('snapshots every alive bagimon when holders are sufficient', async () => {
    const alive = [makeBagimon({ id: 'bg1', coin_mint: 'M1' }), makeBagimon({ id: 'bg2', coin_mint: 'M2' })];
    const repo = { findAllAlive: vi.fn().mockResolvedValue(alive) } as unknown as BagimonRepository;
    const snapshotParents = vi.fn().mockResolvedValue(undefined);
    const parentRepo = { snapshotParents } as unknown as BagimonParentsRepository;
    const getTopHolders = vi.fn().mockResolvedValue([
      { walletAddress: 'wA', holdingAmount: 100, holdingPercentOfSupply: 50 },
      { walletAddress: 'wB', holdingAmount: 50, holdingPercentOfSupply: 25 },
    ]);
    const holderService = { getTopHolders } as unknown as HolderDataService;
    const worker = new ParentSnapshotWorker(repo, parentRepo, holderService);
    const summary = await worker.runOnce();
    expect(summary.snapshotted).toBe(2);
    expect(summary.skipped).toBe(0);
    expect(summary.failed).toBe(0);
    expect(snapshotParents).toHaveBeenCalledTimes(2);
  });

  it('skips bagimons whose coin returns < minHolders holders', async () => {
    const alive = [makeBagimon({ id: 'bg1', coin_mint: 'M1' })];
    const repo = { findAllAlive: vi.fn().mockResolvedValue(alive) } as unknown as BagimonRepository;
    const snapshotParents = vi.fn();
    const parentRepo = { snapshotParents } as unknown as BagimonParentsRepository;
    const getTopHolders = vi.fn().mockResolvedValue([{ walletAddress: 'w', holdingAmount: 1, holdingPercentOfSupply: 100 }]);
    const holderService = { getTopHolders } as unknown as HolderDataService;
    const worker = new ParentSnapshotWorker(repo, parentRepo, holderService);
    const summary = await worker.runOnce();
    expect(summary.snapshotted).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(snapshotParents).not.toHaveBeenCalled();
  });

  it('counts a failure when snapshotParents throws', async () => {
    const alive = [makeBagimon()];
    const repo = { findAllAlive: vi.fn().mockResolvedValue(alive) } as unknown as BagimonRepository;
    const snapshotParents = vi.fn().mockRejectedValue(new Error('boom'));
    const parentRepo = { snapshotParents } as unknown as BagimonParentsRepository;
    const getTopHolders = vi.fn().mockResolvedValue([
      { walletAddress: 'a', holdingAmount: 1, holdingPercentOfSupply: 50 },
      { walletAddress: 'b', holdingAmount: 1, holdingPercentOfSupply: 50 },
    ]);
    const holderService = { getTopHolders } as unknown as HolderDataService;
    const worker = new ParentSnapshotWorker(repo, parentRepo, holderService);
    const summary = await worker.runOnce();
    expect(summary.failed).toBe(1);
    expect(summary.snapshotted).toBe(0);
  });

  it('passes holders[0] = rank 1 implicitly via snapshotParents order', async () => {
    const alive = [makeBagimon()];
    const repo = { findAllAlive: vi.fn().mockResolvedValue(alive) } as unknown as BagimonRepository;
    const captured: Array<{ holders: Array<{ walletAddress: string }> }> = [];
    const snapshotParents = vi.fn(async (input: { holders: Array<{ walletAddress: string }> }) => {
      captured.push(input);
    });
    const parentRepo = { snapshotParents } as unknown as BagimonParentsRepository;
    const getTopHolders = vi.fn().mockResolvedValue([
      { walletAddress: 'top', holdingAmount: 999, holdingPercentOfSupply: 90 },
      { walletAddress: 'next', holdingAmount: 1, holdingPercentOfSupply: 1 },
    ]);
    const holderService = { getTopHolders } as unknown as HolderDataService;
    const worker = new ParentSnapshotWorker(repo, parentRepo, holderService);
    await worker.runOnce();
    expect(captured[0]?.holders[0]?.walletAddress).toBe('top');
  });
});
