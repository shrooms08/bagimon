import { CoinDataError, type CoinFetcher, type CoinStats } from '../types.js';

// Phase 3 stub. Wired into the fallback chain only when HELIUS_API_KEY is set.
// Real holder-count / on-chain fetching lands in Phase 6.
export class HeliusFetcher implements CoinFetcher {
  readonly name = 'helius' as const;
  readonly available: boolean;

  constructor(apiKey: string | undefined) {
    this.available = Boolean(apiKey && apiKey.length > 0);
  }

  async fetch(_mint: string): Promise<CoinStats | null> {
    // TODO(phase-6): use Helius RPC to fetch holder count + recent transfer stats.
    throw new CoinDataError('Helius fetcher not yet implemented');
  }
}
