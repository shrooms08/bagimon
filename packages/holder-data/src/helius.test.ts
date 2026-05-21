import { describe, expect, it, vi } from 'vitest';
import { HeliusHolderFetcher } from './helius.js';

interface RpcCall {
  method: string;
  params: unknown[];
}

function makeFetch(handlers: Record<string, unknown>) {
  const calls: RpcCall[] = [];
  const fn = vi.fn(async (_url: string | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { method: string; params: unknown[] };
    calls.push({ method: body.method, params: body.params });
    const result = handlers[body.method];
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

describe('HeliusHolderFetcher', () => {
  it('reports unavailable when no api key is set', async () => {
    const f = new HeliusHolderFetcher({ apiKey: undefined });
    expect(f.available).toBe(false);
    expect(await f.getTopHolders('mint', 10)).toEqual([]);
  });

  it('dedups token accounts that share an owner', async () => {
    const { fn } = makeFetch({
      getTokenLargestAccounts: {
        value: [
          { address: 'tokAcctA', amount: '100', decimals: 0, uiAmount: 100 },
          { address: 'tokAcctB', amount: '50', decimals: 0, uiAmount: 50 },
          { address: 'tokAcctC', amount: '25', decimals: 0, uiAmount: 25 },
        ],
      },
      getMultipleAccounts: {
        value: [
          { data: { parsed: { info: { owner: 'walletX' } } } },
          { data: { parsed: { info: { owner: 'walletX' } } } }, // same owner — should sum
          { data: { parsed: { info: { owner: 'walletY' } } } },
        ],
      },
    });
    const f = new HeliusHolderFetcher({ apiKey: 'k', fetchImpl: fn });
    const holders = await f.getTopHolders('SomeMint', 10);
    expect(holders).toHaveLength(2);
    expect(holders[0]).toMatchObject({ walletAddress: 'walletX', holdingAmount: 150 });
    expect(holders[1]).toMatchObject({ walletAddress: 'walletY', holdingAmount: 25 });
  });

  it('excludes system program and token program owners', async () => {
    const { fn } = makeFetch({
      getTokenLargestAccounts: {
        value: [
          { address: 'a1', amount: '100', decimals: 0, uiAmount: 100 },
          { address: 'a2', amount: '50', decimals: 0, uiAmount: 50 },
          { address: 'a3', amount: '25', decimals: 0, uiAmount: 25 },
        ],
      },
      getMultipleAccounts: {
        value: [
          { data: { parsed: { info: { owner: '11111111111111111111111111111111' } } } },
          { data: { parsed: { info: { owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' } } } },
          { data: { parsed: { info: { owner: 'realHolder' } } } },
        ],
      },
    });
    const f = new HeliusHolderFetcher({ apiKey: 'k', fetchImpl: fn });
    const holders = await f.getTopHolders('M', 10);
    expect(holders).toHaveLength(1);
    expect(holders[0]?.walletAddress).toBe('realHolder');
  });

  it('respects the limit parameter and sorts descending', async () => {
    const { fn } = makeFetch({
      getTokenLargestAccounts: {
        value: [
          { address: 't1', amount: '1', decimals: 0, uiAmount: 10 },
          { address: 't2', amount: '1', decimals: 0, uiAmount: 100 },
          { address: 't3', amount: '1', decimals: 0, uiAmount: 50 },
        ],
      },
      getMultipleAccounts: {
        value: [
          { data: { parsed: { info: { owner: 'w1' } } } },
          { data: { parsed: { info: { owner: 'w2' } } } },
          { data: { parsed: { info: { owner: 'w3' } } } },
        ],
      },
    });
    const f = new HeliusHolderFetcher({ apiKey: 'k', fetchImpl: fn });
    const holders = await f.getTopHolders('M', 2);
    expect(holders.map((h) => h.walletAddress)).toEqual(['w2', 'w3']);
  });

  it('returns empty array (no throw) on rpc failure', async () => {
    const fn = vi.fn(async () =>
      new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -1, message: 'rate limited' } }), {
        status: 200,
      }),
    ) as unknown as typeof fetch;
    const f = new HeliusHolderFetcher({ apiKey: 'k', fetchImpl: fn });
    const holders = await f.getTopHolders('M', 10);
    expect(holders).toEqual([]);
  });

  it('returns empty array when getTokenLargestAccounts returns nothing', async () => {
    const { fn } = makeFetch({ getTokenLargestAccounts: { value: [] } });
    const f = new HeliusHolderFetcher({ apiKey: 'k', fetchImpl: fn });
    expect(await f.getTopHolders('M', 10)).toEqual([]);
  });

  it('computes holdingPercentOfSupply from aggregate', async () => {
    const { fn } = makeFetch({
      getTokenLargestAccounts: {
        value: [
          { address: 'a', amount: '1', decimals: 0, uiAmount: 75 },
          { address: 'b', amount: '1', decimals: 0, uiAmount: 25 },
        ],
      },
      getMultipleAccounts: {
        value: [
          { data: { parsed: { info: { owner: 'wa' } } } },
          { data: { parsed: { info: { owner: 'wb' } } } },
        ],
      },
    });
    const f = new HeliusHolderFetcher({ apiKey: 'k', fetchImpl: fn });
    const holders = await f.getTopHolders('M', 10);
    expect(holders[0]?.holdingPercentOfSupply).toBeCloseTo(75, 5);
    expect(holders[1]?.holdingPercentOfSupply).toBeCloseTo(25, 5);
  });
});
