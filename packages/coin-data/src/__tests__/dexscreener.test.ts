import { describe, expect, it } from 'vitest';
import { DexScreenerFetcher } from '../fetchers/dexscreener.js';
import { CoinDataError } from '../types.js';

const VALID_MINT = 'So11111111111111111111111111111111111111112';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('DexScreenerFetcher', () => {
  it('parses a typical response and picks highest-volume pair', async () => {
    const body = {
      pairs: [
        {
          baseToken: { address: VALID_MINT, symbol: 'WIF', name: 'dogwifhat' },
          priceUsd: '1.23',
          priceChange: { h24: -12.5 },
          volume: { h24: 5000 },
          txns: { h24: { buys: 100, sells: 80 } },
          marketCap: 1_000_000,
          liquidity: { usd: 50_000 },
          pairCreatedAt: 1_700_000_000_000,
        },
        {
          baseToken: { address: VALID_MINT, symbol: 'WIF', name: 'dogwifhat' },
          priceUsd: '1.25',
          volume: { h24: 50_000 },
          txns: { h24: { buys: 500, sells: 400 } },
        },
      ],
    };
    const fetchFn = async () => jsonResponse(body);
    const fetcher = new DexScreenerFetcher(fetchFn as unknown as typeof fetch);
    const stats = await fetcher.fetch(VALID_MINT);
    expect(stats).not.toBeNull();
    expect(stats?.priceUsd).toBe(1.25);
    expect(stats?.volume24hUsd).toBe(50_000);
    expect(stats?.symbol).toBe('WIF');
    expect(stats?.buys24h).toBe(500);
    expect(stats?.source).toBe('dexscreener');
  });

  it('returns null when no pairs', async () => {
    const fetchFn = async () => jsonResponse({ pairs: [] });
    const fetcher = new DexScreenerFetcher(fetchFn as unknown as typeof fetch);
    expect(await fetcher.fetch(VALID_MINT)).toBeNull();
  });

  it('returns null when pairs is missing/null', async () => {
    const fetchFn = async () => jsonResponse({ pairs: null });
    const fetcher = new DexScreenerFetcher(fetchFn as unknown as typeof fetch);
    expect(await fetcher.fetch(VALID_MINT)).toBeNull();
  });

  it('throws on 429', async () => {
    const fetchFn = async () => new Response('', { status: 429 });
    const fetcher = new DexScreenerFetcher(fetchFn as unknown as typeof fetch);
    await expect(fetcher.fetch(VALID_MINT)).rejects.toThrow(/rate limited/);
  });

  it('throws on network failure', async () => {
    const fetchFn = async () => {
      throw new Error('econnreset');
    };
    const fetcher = new DexScreenerFetcher(fetchFn as unknown as typeof fetch);
    await expect(fetcher.fetch(VALID_MINT)).rejects.toThrow(CoinDataError);
  });

  it('throws on malformed JSON', async () => {
    const fetchFn = async () =>
      new Response('not json', { status: 200, headers: { 'content-type': 'application/json' } });
    const fetcher = new DexScreenerFetcher(fetchFn as unknown as typeof fetch);
    await expect(fetcher.fetch(VALID_MINT)).rejects.toThrow(/malformed/);
  });

  it('rejects invalid mint', async () => {
    const fetcher = new DexScreenerFetcher((async () => jsonResponse({})) as unknown as typeof fetch);
    await expect(fetcher.fetch('not-a-mint')).rejects.toThrow(/invalid mint/);
  });

  it('handles missing optional fields gracefully', async () => {
    const body = {
      pairs: [{ baseToken: { address: VALID_MINT }, priceUsd: '0.5' }],
    };
    const fetchFn = async () => jsonResponse(body);
    const fetcher = new DexScreenerFetcher(fetchFn as unknown as typeof fetch);
    const stats = await fetcher.fetch(VALID_MINT);
    expect(stats?.priceUsd).toBe(0.5);
    expect(stats?.volume24hUsd).toBeNull();
    expect(stats?.priceChange24hPct).toBeNull();
    expect(stats?.symbol).toBeNull();
  });
});
