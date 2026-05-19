import { CoinDataError, isValidMint, type CoinFetcher, type CoinStats } from '../types.js';

const ENDPOINT = 'https://lite-api.jup.ag/price/v3';

interface JupPriceEntry {
  usdPrice?: number;
  price?: number;
}

type JupResponse = Record<string, JupPriceEntry | null | undefined>;

export class JupiterFetcher implements CoinFetcher {
  readonly name = 'jupiter' as const;
  readonly available = true;

  constructor(private readonly fetchFn: typeof fetch = fetch) {}

  async fetch(mint: string): Promise<CoinStats | null> {
    if (!isValidMint(mint)) {
      throw new CoinDataError(`invalid mint: ${mint}`);
    }
    let res: Response;
    try {
      res = await this.fetchFn(`${ENDPOINT}?ids=${mint}`, {
        headers: { accept: 'application/json' },
      });
    } catch (err) {
      throw new CoinDataError(
        `jupiter network error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (res.status === 429) throw new CoinDataError('jupiter rate limited (429)');
    if (!res.ok) throw new CoinDataError(`jupiter http ${res.status}`);

    let json: JupResponse;
    try {
      json = (await res.json()) as JupResponse;
    } catch (err) {
      throw new CoinDataError(
        `jupiter malformed json: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const entry = json[mint];
    const price = entry?.usdPrice ?? entry?.price ?? null;
    if (price == null || !Number.isFinite(price)) return null;

    return {
      mint,
      symbol: null,
      name: null,
      priceUsd: price,
      priceChange24hPct: null,
      volume24hUsd: null,
      buys24h: null,
      sells24h: null,
      uniqueBuyers24h: null,
      marketCapUsd: null,
      liquidityUsd: null,
      pairCreatedAt: null,
      fetchedAt: new Date(),
      source: 'jupiter',
    };
  }
}
