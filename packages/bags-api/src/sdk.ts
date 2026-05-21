import { BagsSDK } from '@bagsfm/bags-sdk';
import { Connection } from '@solana/web3.js';

let _sdk: BagsSDK | null = null;

function resolveRpcUrl(): string | null {
  const direct = process.env.HELIUS_RPC_URL ?? process.env.SOLANA_RPC_URL;
  if (direct) return direct;
  const heliusKey = process.env.HELIUS_API_KEY;
  if (heliusKey) return `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;
  return null;
}

export function getBagsSdk(): BagsSDK {
  if (_sdk) return _sdk;

  const apiKey = process.env.BAGS_API_KEY;
  const rpcUrl = resolveRpcUrl();

  if (!apiKey) throw new Error('BAGS_API_KEY is required');
  if (!rpcUrl) throw new Error('HELIUS_RPC_URL, SOLANA_RPC_URL, or HELIUS_API_KEY is required');

  const connection = new Connection(rpcUrl);
  _sdk = new BagsSDK(apiKey, connection, 'processed');
  return _sdk;
}
