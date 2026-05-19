import { describe, expect, it, vi } from 'vitest';
import { MoodLoop } from './index.js';
import type { BagimonRepository, Bagimon } from '@bagimon/db';
import type { CoinStatsService, CoinStats } from '@bagimon/coin-data';

function bagimon(overrides: Partial<Bagimon> = {}): Bagimon {
  const now = new Date().toISOString();
  return {
    id: 'bg-1',
    discord_server_id: 'srv',
    discord_server_name: null,
    coin_mint: 'mint-1',
    coin_symbol: null,
    coin_name: null,
    current_mood: 'happy',
    is_alive: true,
    born_at: now,
    died_at: null,
    last_activity_at: now,
    spawned_by_discord_user_id: 'u',
    created_at: now,
    updated_at: now,
    last_stats_at: null,
    last_price_usd: null,
    last_volume24h_usd: null,
    last_price_change_24h_pct: null,
    ...overrides,
  };
}

function statsFor(overrides: Partial<CoinStats> = {}): CoinStats {
  return {
    mint: 'mint-1',
    symbol: 'WIF',
    name: 'dogwifhat',
    priceUsd: 1,
    priceChange24hPct: 0,
    volume24hUsd: 5000,
    buys24h: 10,
    sells24h: 10,
    uniqueBuyers24h: 10,
    marketCapUsd: null,
    liquidityUsd: null,
    pairCreatedAt: null,
    fetchedAt: new Date(),
    source: 'dexscreener',
    ...overrides,
  };
}

function mockRepo(bagimons: Bagimon[]) {
  const updateMood = vi.fn(async () => bagimons[0]!);
  const updateStats = vi.fn(async () => undefined);
  const findAllAlive = vi.fn(async () => bagimons);
  return {
    repo: {
      findAllAlive,
      updateMood,
      updateStats,
    } as unknown as BagimonRepository,
    updateMood,
    updateStats,
    findAllAlive,
  };
}

function mockCoinStats(impl: (mint: string) => Promise<CoinStats>): CoinStatsService {
  return { getStats: impl } as unknown as CoinStatsService;
}

describe('MoodLoop.runOnce', () => {
  it('evaluates all alive bagimons and records no change when mood is stable', async () => {
    const b = bagimon({ current_mood: 'happy' });
    const { repo, updateMood, updateStats } = mockRepo([b]);
    const coinStats = mockCoinStats(async () => statsFor());
    const loop = new MoodLoop(repo, coinStats);
    const summary = await loop.runOnce();
    expect(summary.evaluated).toBe(1);
    expect(summary.moodChanged).toBe(0);
    expect(summary.failed).toBe(0);
    expect(updateMood).not.toHaveBeenCalled();
    expect(updateStats).toHaveBeenCalledOnce();
  });

  it('records a mood change when computed mood differs', async () => {
    const b = bagimon({ current_mood: 'happy' });
    const { repo, updateMood } = mockRepo([b]);
    const coinStats = mockCoinStats(async () =>
      statsFor({ priceChange24hPct: -50 }),
    );
    const loop = new MoodLoop(repo, coinStats);
    const summary = await loop.runOnce();
    expect(summary.moodChanged).toBe(1);
    expect(updateMood).toHaveBeenCalledWith('bg-1', 'sick', 'price_drop_30pct');
  });

  it('counts failures when coin-data throws and continues', async () => {
    const b1 = bagimon({ id: 'a', coin_mint: 'm-a' });
    const b2 = bagimon({ id: 'b', coin_mint: 'm-b', current_mood: 'happy' });
    const { repo, updateStats } = mockRepo([b1, b2]);
    const coinStats = mockCoinStats(async (mint) => {
      if (mint === 'm-a') throw new Error('boom');
      return statsFor();
    });
    const loop = new MoodLoop(repo, coinStats);
    const summary = await loop.runOnce();
    expect(summary.evaluated).toBe(2);
    expect(summary.failed).toBe(1);
    expect(updateStats).toHaveBeenCalledOnce();
  });

  it('filters by mint when given', async () => {
    const b1 = bagimon({ id: 'a', coin_mint: 'm-a' });
    const b2 = bagimon({ id: 'b', coin_mint: 'm-b' });
    const { repo } = mockRepo([b1, b2]);
    const coinStats = mockCoinStats(async () => statsFor());
    const loop = new MoodLoop(repo, coinStats);
    const summary = await loop.runOnce('m-b');
    expect(summary.evaluated).toBe(1);
  });

  it('respects concurrency limit', async () => {
    const list = [1, 2, 3, 4, 5, 6].map((i) =>
      bagimon({ id: `b-${i}`, coin_mint: `m-${i}` }),
    );
    const { repo } = mockRepo(list);
    let active = 0;
    let peak = 0;
    const coinStats = mockCoinStats(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 10));
      active -= 1;
      return statsFor();
    });
    const loop = new MoodLoop(repo, coinStats, { concurrency: 2 });
    await loop.runOnce();
    expect(peak).toBeLessThanOrEqual(2);
  });
});
