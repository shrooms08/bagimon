import { CoinDataError, type CoinFetcher, type CoinStats } from './types.js';

interface CacheEntry {
  stats: CoinStats;
  cachedAt: number;
}

export interface CoinStatsServiceOptions {
  cacheTtlMs?: number;
  now?: () => number;
}

const DEFAULT_TTL_MS = 60_000;

// Tries each fetcher in order. If the first returns a CoinStats with partial
// data (e.g. price missing), later fetchers can fill the gaps. If all fail,
// throws — we never return all-null poison.
export class CoinStatsService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(
    private readonly fetchers: CoinFetcher[],
    options: CoinStatsServiceOptions = {},
  ) {
    this.ttlMs = options.cacheTtlMs ?? DEFAULT_TTL_MS;
    this.now = options.now ?? (() => Date.now());
  }

  async getStats(mint: string): Promise<CoinStats> {
    const cached = this.cache.get(mint);
    if (cached && this.now() - cached.cachedAt < this.ttlMs) {
      return cached.stats;
    }

    let merged: CoinStats | null = null;
    const errors: string[] = [];

    for (const fetcher of this.fetchers) {
      if (!fetcher.available) continue;
      try {
        const result = await fetcher.fetch(mint);
        if (!result) continue;
        merged = merged ? mergePartial(merged, result) : result;
        // Stop early if primary fetcher gave us price + volume.
        if (merged.priceUsd != null && merged.volume24hUsd != null) break;
      } catch (err) {
        errors.push(
          `${fetcher.name}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (!merged) {
      throw new CoinDataError(
        `all coin-data fetchers failed for ${mint}: ${errors.join('; ') || 'no data'}`,
      );
    }

    this.cache.set(mint, { stats: merged, cachedAt: this.now() });
    return merged;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

function mergePartial(a: CoinStats, b: CoinStats): CoinStats {
  return {
    mint: a.mint,
    symbol: a.symbol ?? b.symbol,
    name: a.name ?? b.name,
    priceUsd: a.priceUsd ?? b.priceUsd,
    priceChange24hPct: a.priceChange24hPct ?? b.priceChange24hPct,
    volume24hUsd: a.volume24hUsd ?? b.volume24hUsd,
    buys24h: a.buys24h ?? b.buys24h,
    sells24h: a.sells24h ?? b.sells24h,
    uniqueBuyers24h: a.uniqueBuyers24h ?? b.uniqueBuyers24h,
    marketCapUsd: a.marketCapUsd ?? b.marketCapUsd,
    liquidityUsd: a.liquidityUsd ?? b.liquidityUsd,
    pairCreatedAt: a.pairCreatedAt ?? b.pairCreatedAt,
    fetchedAt: a.fetchedAt,
    source: 'partial',
  };
}
