import { PublicKey } from '@solana/web3.js';
import { getBagsSdk } from './sdk.js';
import type { BagsCreator } from './types.js';

export async function fetchCreators(mint: string): Promise<BagsCreator[] | null> {
  try {
    const sdk = getBagsSdk();
    const creators = await sdk.state.getTokenCreators(new PublicKey(mint));
    return (creators as BagsCreator[]) ?? [];
  } catch {
    return null;
  }
}

export function getPrimaryCreator(creators: BagsCreator[]): BagsCreator | null {
  return creators.find((c) => c.isCreator) ?? null;
}
