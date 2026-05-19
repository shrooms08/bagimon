import { CoinDataError, isValidMint, type CoinFetcher, type CoinStats } from '../types.js';

const ENDPOINT = 'https://api.dexscreener.com/latest/dex/tokens';

interface DexPair {
  baseToken?: { address?: string; symbol?: string; name?: string };
  priceUsd?: string;
  priceChange?: { h24?: number };
  volume?: { h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
  fdv?: number;
  marketCap?: number;
  liquidity?: { usd?: number };
  pairCreatedAt?: number;
}

interface DexResponse {
  pairs?: DexPair[] | null;
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.length > 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pickCanonicalPair(pairs: DexPair[], mint: string): DexPair | null {
  const baseMatches = pairs.filter(
    (p) => p.baseToken?.address?.toLowerCase() === mint.toLowerCase(),
  );
  const pool = baseMatches.length > 0 ? baseMatches : pairs;
  let best: DexPair | null = null;
  let bestVol = -1;
  for (const p of pool) {
    const v = toNumber(p.volume?.h24) ?? 0;
    if (v > bestVol) {
      bestVol = v;
      best = p;
    }
  }
  return best;
}

export class DexScreenerFetcher implements CoinFetcher {
  readonly name = 'dexscreener' as const;
  readonly available = true;

  constructor(private readonly fetchFn: typeof fetch = fetch) {}

  async fetch(mint: string): Promise<CoinStats | null> {
    if (!isValidMint(mint)) {
      throw new CoinDataError(`invalid mint: ${mint}`);
    }
    let res: Response;
    try {
      res = await this.fetchFn(`${ENDPOINT}/${mint}`, {
        headers: { accept: 'application/json' },
      });
    } catch (err) {
      throw new CoinDataError(
        `dexscreener network error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (res.status === 429) {
      throw new CoinDataError('dexscreener rate limited (429)');
    }
    if (!res.ok) {
      throw new CoinDataError(`dexscreener http ${res.status}`);
    }
    let json: DexResponse;
    try {
      json = (await res.json()) as DexResponse;
    } catch (err) {
      throw new CoinDataError(
        `dexscreener malformed json: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const pairs = Array.isArray(json.pairs) ? json.pairs : [];
    if (pairs.length === 0) return null;

    const pair = pickCanonicalPair(pairs, mint);
    if (!pair) return null;

    const buys = toNumber(pair.txns?.h24?.buys);
    const sells = toNumber(pair.txns?.h24?.sells);

    return {
      mint,
      symbol: pair.baseToken?.symbol ?? null,
      name: pair.baseToken?.name ?? null,
      priceUsd: toNumber(pair.priceUsd),
      priceChange24hPct: toNumber(pair.priceChange?.h24),
      volume24hUsd: toNumber(pair.volume?.h24),
      buys24h: buys,
      sells24h: sells,
      uniqueBuyers24h: null,
      marketCapUsd: toNumber(pair.marketCap) ?? toNumber(pair.fdv),
      liquidityUsd: toNumber(pair.liquidity?.usd),
      pairCreatedAt: typeof pair.pairCreatedAt === 'number' ? new Date(pair.pairCreatedAt) : null,
      fetchedAt: new Date(),
      source: 'dexscreener',
    };
  }
}
