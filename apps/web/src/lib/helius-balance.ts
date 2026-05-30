import 'server-only';

// Read a wallet's balance of a given SPL mint via Helius RPC, reusing the same
// JSON-RPC pattern as packages/holder-data. Returns the UI amount (decimal),
// summed across all token accounts the owner holds for that mint.

interface ParsedTokenAmount {
  uiAmount: number | null;
}

interface ParsedTokenAccount {
  account?: {
    data?: {
      parsed?: { info?: { tokenAmount?: ParsedTokenAmount } };
    };
  };
}

interface TokenAccountsResult {
  value?: ParsedTokenAccount[];
}

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

function rpcUrl(): string {
  // Prefer the public client RPC (Helius URL) if set, else build from the key.
  const explicit = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (explicit) return explicit;
  const key = process.env.HELIUS_API_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_SOLANA_RPC_URL or HELIUS_API_KEY must be set');
  return `https://mainnet.helius-rpc.com/?api-key=${key}`;
}

export async function getTokenBalance(wallet: string, mint: string): Promise<number> {
  const res = await fetch(rpcUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [wallet, { mint }, { encoding: 'jsonParsed' }],
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`getTokenAccountsByOwner ${res.status}`);
  const json = (await res.json()) as JsonRpcResponse<TokenAccountsResult>;
  if (json.error) throw new Error(`Helius: ${json.error.message}`);
  const accounts = json.result?.value ?? [];
  let total = 0;
  for (const acct of accounts) {
    const amt = acct.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
    if (typeof amt === 'number') total += amt;
  }
  return total;
}
