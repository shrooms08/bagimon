import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getBagsSdk } from './sdk.js';
import type { BagsLifetimeFees } from './types.js';

export async function fetchLifetimeFees(mint: string): Promise<BagsLifetimeFees | null> {
  try {
    const sdk = getBagsSdk();
    const lamports = await sdk.state.getTokenLifetimeFees(new PublicKey(mint));
    if (lamports == null) return null;
    const lamportsNum = typeof lamports === 'number' ? lamports : Number(lamports);
    if (!Number.isFinite(lamportsNum)) return null;
    return {
      lamports: lamportsNum,
      sol: lamportsNum / LAMPORTS_PER_SOL,
    };
  } catch {
    return null;
  }
}
