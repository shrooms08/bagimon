import type { Holder, HolderFetcher } from './types.js';

interface CacheEntry {
  expiresAt: number;
  holders: Holder[];
}

export interface HolderDataServiceOptions {
  // Cache TTL in milliseconds. Helius rate limits matter more than freshness
  // here — top holders change slowly. Default: 24h.
  cacheTtlMs?: number;
  now?: () => number;
}

export class HolderDataService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(
    private readonly fetcher: HolderFetcher,
    options: HolderDataServiceOptions = {},
  ) {
    this.ttlMs = options.cacheTtlMs ?? 24 * 60 * 60 * 1000;
    this.now = options.now ?? (() => Date.now());
  }

  async getTopHolders(mint: string, limit = 10): Promise<Holder[]> {
    const key = `${mint}:${limit}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > this.now()) {
      return cached.holders;
    }
    const holders = await this.fetcher.getTopHolders(mint, limit);
    this.cache.set(key, { expiresAt: this.now() + this.ttlMs, holders });
    return holders;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
