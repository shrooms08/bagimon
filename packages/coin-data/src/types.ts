export type CoinStatsSource = 'dexscreener' | 'jupiter' | 'helius' | 'partial';

export interface CoinStats {
  mint: string;
  symbol: string | null;
  name: string | null;
  priceUsd: number | null;
  priceChange24hPct: number | null;
  volume24hUsd: number | null;
  buys24h: number | null;
  sells24h: number | null;
  uniqueBuyers24h: number | null;
  marketCapUsd: number | null;
  liquidityUsd: number | null;
  pairCreatedAt: Date | null;
  fetchedAt: Date;
  source: CoinStatsSource;
}

export interface CoinFetcher {
  readonly name: CoinStatsSource;
  readonly available: boolean;
  fetch(mint: string): Promise<CoinStats | null>;
}

export class CoinDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoinDataError';
  }
}

const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidMint(mint: string): boolean {
  return MINT_RE.test(mint);
}
