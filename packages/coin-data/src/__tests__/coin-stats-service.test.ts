import { describe, expect, it } from 'vitest';
import { CoinStatsService } from '../coin-stats-service.js';
import type { CoinFetcher, CoinStats, CoinStatsSource } from '../types.js';

const VALID_MINT = 'So11111111111111111111111111111111111111112';

function stubFetcher(
  name: CoinStatsSource,
  result: CoinStats | null | Error,
  available = true,
): CoinFetcher & { calls: number } {
  const f = {
    name,
    available,
    calls: 0,
    async fetch(): Promise<CoinStats | null> {
      this.calls += 1;
      if (result instanceof Error) throw result;
      return result;
    },
  };
  return f as CoinFetcher & { calls: number };
}

function baseStats(source: CoinStatsSource, overrides: Partial<CoinStats> = {}): CoinStats {
  return {
    mint: VALID_MINT,
    symbol: null,
    name: null,
    priceUsd: null,
    priceChange24hPct: null,
    volume24hUsd: null,
    buys24h: null,
    sells24h: null,
    uniqueBuyers24h: null,
    marketCapUsd: null,
    liquidityUsd: null,
    pairCreatedAt: null,
    fetchedAt: new Date(),
    source,
    ...overrides,
  };
}

describe('CoinStatsService', () => {
  it('returns stats from the first successful fetcher', async () => {
    const dex = stubFetcher('dexscreener', baseStats('dexscreener', { priceUsd: 1, volume24hUsd: 100 }));
    const jup = stubFetcher('jupiter', baseStats('jupiter', { priceUsd: 2 }));
    const svc = new CoinStatsService([dex, jup]);
    const out = await svc.getStats(VALID_MINT);
    expect(out.priceUsd).toBe(1);
    expect(dex.calls).toBe(1);
    expect(jup.calls).toBe(0);
  });

  it('falls back to the next fetcher when the first returns null', async () => {
    const dex = stubFetcher('dexscreener', null);
    const jup = stubFetcher('jupiter', baseStats('jupiter', { priceUsd: 0.42 }));
    const svc = new CoinStatsService([dex, jup]);
    const out = await svc.getStats(VALID_MINT);
    expect(out.priceUsd).toBe(0.42);
    expect(out.source).toBe('jupiter');
  });

  it('falls back when first fetcher throws', async () => {
    const dex = stubFetcher('dexscreener', new Error('boom'));
    const jup = stubFetcher('jupiter', baseStats('jupiter', { priceUsd: 0.42 }));
    const svc = new CoinStatsService([dex, jup]);
    const out = await svc.getStats(VALID_MINT);
    expect(out.priceUsd).toBe(0.42);
  });

  it('throws when all fetchers fail', async () => {
    const dex = stubFetcher('dexscreener', new Error('boom'));
    const jup = stubFetcher('jupiter', null);
    const svc = new CoinStatsService([dex, jup]);
    await expect(svc.getStats(VALID_MINT)).rejects.toThrow(/all coin-data fetchers failed/);
  });

  it('skips unavailable fetchers', async () => {
    const helius = stubFetcher('helius', new Error('should not run'), false);
    const jup = stubFetcher('jupiter', baseStats('jupiter', { priceUsd: 1 }));
    const svc = new CoinStatsService([helius, jup]);
    await svc.getStats(VALID_MINT);
    expect(helius.calls).toBe(0);
    expect(jup.calls).toBe(1);
  });

  it('caches results within TTL', async () => {
    const dex = stubFetcher('dexscreener', baseStats('dexscreener', { priceUsd: 1, volume24hUsd: 1 }));
    let now = 1000;
    const svc = new CoinStatsService([dex], { cacheTtlMs: 60_000, now: () => now });
    await svc.getStats(VALID_MINT);
    await svc.getStats(VALID_MINT);
    expect(dex.calls).toBe(1);
    now += 60_001;
    await svc.getStats(VALID_MINT);
    expect(dex.calls).toBe(2);
  });
});
