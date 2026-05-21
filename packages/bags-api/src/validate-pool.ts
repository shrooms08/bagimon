import { PublicKey } from '@solana/web3.js';
import { getBagsSdk } from './sdk.js';

/**
 * Returns true if the given mint is a Bags-launched coin.
 * Uses getTokenCreators as the probe — a non-Bags mint won't have Bags
 * creators registered, so the SDK call throws or returns an empty array.
 */
export async function validateBagsPool(mint: string): Promise<boolean> {
  try {
    const sdk = getBagsSdk();
    const creators = await sdk.state.getTokenCreators(new PublicKey(mint));
    return Array.isArray(creators) && creators.length > 0;
  } catch (err) {
    console.warn('[bags-api] validateBagsPool failed:', err);
    return false;
  }
}
