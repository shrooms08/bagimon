import { describe, expect, it, vi } from 'vitest';
import { MoodLoop } from './index.js';
import type {
  BagimonRepository,
  Bagimon,
  MoodTransition,
  MoodTransitionsRepository,
} from '@bagimon/db';
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
  const findById = vi.fn(async (id: string) => bagimons.find((b) => b.id === id) ?? null);
  const markDead = vi.fn(async () => undefined);
  return {
    repo: {
      findAllAlive,
      findById,
      updateMood,
      updateStats,
      markDead,
    } as unknown as BagimonRepository,
    updateMood,
    updateStats,
    findAllAlive,
    findById,
    markDead,
  };
}

function mockMoodTransitions(rows: MoodTransition[]): MoodTransitionsRepository {
  return {
    getRecent: async () => rows,
  } as unknown as MoodTransitionsRepository;
}

function transition(mood: Bagimon['current_mood'], at: Date): MoodTransition {
  return {
    id: `t-${at.getTime()}`,
    bagimon_id: 'bg-1',
    from_mood: null,
    to_mood: mood,
    trigger_reason: null,
    created_at: at.toISOString(),
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

  it('marks bagimon dead and skips updateMood when dying streak >= threshold', async () => {
    const now = new Date('2026-05-20T12:00:00Z');
    const bornAt = new Date(now.getTime() - 30 * 86_400_000);
    const b = bagimon({
      current_mood: 'dying',
      born_at: bornAt.toISOString(),
      // last_activity_at long ago so computeMood returns 'dying' via DYING_DAYS_INACTIVE.
      last_activity_at: bornAt.toISOString(),
    });
    const { repo, updateMood, updateStats, markDead } = mockRepo([b]);
    const transitions = [
      transition('dying', new Date(now.getTime() - 14 * 86_400_000)),
      transition('happy', new Date(now.getTime() - 20 * 86_400_000)),
    ];
    const onDeath = vi.fn(async () => undefined);
    const loop = new MoodLoop(repo, mockCoinStats(async () => statsFor({ volume24hUsd: 0 })), {
      moodTransitions: mockMoodTransitions(transitions),
      deathDaysThreshold: 14,
      now: () => now.getTime(),
      onDeath,
    });
    const summary = await loop.runOnce();
    expect(summary.died).toBe(1);
    expect(markDead).toHaveBeenCalledWith('bg-1', expect.objectContaining({ mood: 'dying' }));
    expect(updateMood).not.toHaveBeenCalled();
    expect(updateStats).not.toHaveBeenCalled();
    expect(onDeath).toHaveBeenCalledOnce();
  });

  it('kills a Bagimon when current_mood=dying and streak >= threshold, even when live data would compute a non-dying mood', async () => {
    const now = new Date('2026-05-20T12:00:00Z');
    const bornAt = new Date(now.getTime() - 30 * 86_400_000);
    const b = bagimon({
      current_mood: 'dying',
      born_at: bornAt.toISOString(),
      last_activity_at: new Date(now.getTime() - 60_000).toISOString(),
    });
    const { repo, updateMood, updateStats, markDead } = mockRepo([b]);
    const transitions = [
      transition('dying', new Date(now.getTime() - 14 * 86_400_000)),
    ];
    // Healthy live stats — computeMood would return 'happy' here.
    const loop = new MoodLoop(
      repo,
      mockCoinStats(async () => statsFor({ volume24hUsd: 5000, priceChange24hPct: 0 })),
      {
        moodTransitions: mockMoodTransitions(transitions),
        deathDaysThreshold: 14,
        now: () => now.getTime(),
      },
    );
    const summary = await loop.runOnce();
    expect(summary.died).toBe(1);
    expect(markDead).toHaveBeenCalledOnce();
    expect(updateMood).not.toHaveBeenCalled();
    expect(updateStats).not.toHaveBeenCalled();
  });

  it('does not mark dead when streak is below threshold', async () => {
    const now = new Date('2026-05-20T12:00:00Z');
    const bornAt = new Date(now.getTime() - 30 * 86_400_000);
    const b = bagimon({
      current_mood: 'dying',
      born_at: bornAt.toISOString(),
      last_activity_at: bornAt.toISOString(),
    });
    const { repo, markDead } = mockRepo([b]);
    const transitions = [
      transition('dying', new Date(now.getTime() - 3 * 86_400_000)),
      transition('happy', new Date(now.getTime() - 5 * 86_400_000)),
    ];
    const loop = new MoodLoop(repo, mockCoinStats(async () => statsFor({ volume24hUsd: 0 })), {
      moodTransitions: mockMoodTransitions(transitions),
      deathDaysThreshold: 14,
      now: () => now.getTime(),
    });
    const summary = await loop.runOnce();
    expect(summary.died).toBe(0);
    expect(markDead).not.toHaveBeenCalled();
  });

  it('refetches the Bagimon before death check, so expedite mutations between snapshot and tick still kill', async () => {
    const now = new Date('2026-05-20T12:00:00Z');
    const bornAt = new Date(now.getTime() - 30 * 86_400_000);
    // Snapshot from findAllAlive — stale: still says 'hungry'.
    const stale = bagimon({
      current_mood: 'hungry',
      born_at: bornAt.toISOString(),
      last_activity_at: new Date(now.getTime() - 60_000).toISOString(),
    });
    // Fresh row after /bagimon expedite ran: current_mood now 'dying'.
    const fresh: Bagimon = { ...stale, current_mood: 'dying' };
    const { repo, updateMood, markDead, findById } = mockRepo([stale]);
    (findById as unknown as { mockImplementation: (fn: () => Promise<Bagimon>) => void })
      .mockImplementation(async () => fresh);
    const transitions = [
      transition('dying', new Date(now.getTime() - 14 * 86_400_000)),
    ];
    const loop = new MoodLoop(
      repo,
      mockCoinStats(async () => statsFor({ volume24hUsd: 5000, priceChange24hPct: 0 })),
      {
        moodTransitions: mockMoodTransitions(transitions),
        deathDaysThreshold: 14,
        now: () => now.getTime(),
      },
    );
    const summary = await loop.runOnce();
    expect(summary.died).toBe(1);
    expect(markDead).toHaveBeenCalledOnce();
    expect(updateMood).not.toHaveBeenCalled();
  });

  it('does not run death check when current_mood is not dying, even with an arbitrarily long streak', async () => {
    const now = new Date('2026-05-20T12:00:00Z');
    const bornAt = new Date(now.getTime() - 30 * 86_400_000);
    const b = bagimon({
      current_mood: 'hungry',
      born_at: bornAt.toISOString(),
      last_activity_at: bornAt.toISOString(),
    });
    const { repo, markDead } = mockRepo([b]);
    const getRecent = vi.fn(async () => [] as MoodTransition[]);
    const transitions = { getRecent } as unknown as MoodTransitionsRepository;
    const loop = new MoodLoop(repo, mockCoinStats(async () => statsFor({ volume24hUsd: 0 })), {
      moodTransitions: transitions,
      deathDaysThreshold: 0.01,
      now: () => now.getTime(),
    });
    const summary = await loop.runOnce();
    expect(summary.died).toBe(0);
    expect(markDead).not.toHaveBeenCalled();
    expect(getRecent).not.toHaveBeenCalled();
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
