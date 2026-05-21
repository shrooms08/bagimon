import { HolderDataError, type Holder, type HolderFetcher } from './types.js';

// Well-known non-holder addresses we never count as parents.
// Liquidity pool / AMM program addresses are not enumerable up front;
// for v1 we just dedup by owner and exclude these obvious system slots.
// If we need richer filtering later, store a Bags.fm creator address on
// the bagimon row and exclude it too.
const EXCLUDED_OWNERS = new Set<string>([
  '11111111111111111111111111111111', // System Program
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // Associated Token Program
  '1nc1nerator11111111111111111111111111111111', // Common burn address
]);

interface LargestAccountsResult {
  value: Array<{
    address: string;
    amount: string;
    decimals: number;
    uiAmount: number | null;
  }>;
}

interface ParsedTokenAccountInfo {
  owner?: string;
}

interface ParsedAccountData {
  program?: string;
  parsed?: { info?: ParsedTokenAccountInfo };
}

interface MultipleAccountsResult {
  value: Array<{
    data?: ParsedAccountData | [string, string] | null;
    owner?: string;
  } | null>;
}

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

export interface HeliusHolderFetcherOptions {
  apiKey: string | undefined;
  // Override for tests.
  fetchImpl?: typeof fetch;
  // Override the base URL (e.g. for a paid Helius plan or a mock server).
  rpcUrl?: string;
}

export class HeliusHolderFetcher implements HolderFetcher {
  readonly name = 'helius' as const;
  readonly available: boolean;
  private readonly apiKey: string | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly rpcUrl: string | null;

  constructor(opts: HeliusHolderFetcherOptions) {
    this.apiKey = opts.apiKey;
    this.available = Boolean(opts.apiKey && opts.apiKey.length > 0);
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.rpcUrl = opts.rpcUrl ?? (this.available ? `https://mainnet.helius-rpc.com/?api-key=${this.apiKey}` : null);
  }

  async getTopHolders(mint: string, limit: number): Promise<Holder[]> {
    if (!this.available || !this.rpcUrl) return [];
    try {
      const largest = await this.rpc<LargestAccountsResult>('getTokenLargestAccounts', [mint]);
      const tokenAccounts = largest?.value ?? [];
      if (tokenAccounts.length === 0) return [];

      const supply = tokenAccounts.reduce((sum, a) => sum + (a.uiAmount ?? 0), 0);
      const addresses = tokenAccounts.map((a) => a.address);
      const ownerInfo = await this.rpc<MultipleAccountsResult>('getMultipleAccounts', [
        addresses,
        { encoding: 'jsonParsed' },
      ]);
      const owners = ownerInfo?.value ?? [];

      // Sum per owner — one wallet can hold multiple token accounts.
      const byOwner = new Map<string, number>();
      for (let i = 0; i < tokenAccounts.length; i += 1) {
        const acct = tokenAccounts[i];
        if (!acct) continue;
        const info = owners[i];
        const owner = extractOwner(info);
        if (!owner) continue;
        if (EXCLUDED_OWNERS.has(owner)) continue;
        if (owner === mint) continue;
        const amt = acct.uiAmount ?? 0;
        if (amt <= 0) continue;
        byOwner.set(owner, (byOwner.get(owner) ?? 0) + amt);
      }

      const ranked: Holder[] = Array.from(byOwner.entries())
        .map(([walletAddress, holdingAmount]) => ({
          walletAddress,
          holdingAmount,
          holdingPercentOfSupply: supply > 0 ? (holdingAmount / supply) * 100 : null,
        }))
        .sort((a, b) => b.holdingAmount - a.holdingAmount)
        .slice(0, limit);

      return ranked;
    } catch (err) {
      console.warn(
        `[holder-data] Helius lookup failed for ${mint}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }

  private async rpc<T>(method: string, params: unknown[]): Promise<T | null> {
    if (!this.rpcUrl) return null;
    const res = await this.fetchImpl(this.rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    if (!res.ok) throw new HolderDataError(`${method} ${res.status}`);
    const json = (await res.json()) as JsonRpcResponse<T>;
    if (json.error) throw new HolderDataError(`${method}: ${json.error.message}`);
    return json.result ?? null;
  }
}

function extractOwner(
  info: MultipleAccountsResult['value'][number] | undefined,
): string | null {
  if (!info) return null;
  const data = info.data;
  if (data && !Array.isArray(data) && data.parsed?.info?.owner) {
    return data.parsed.info.owner;
  }
  return null;
}
