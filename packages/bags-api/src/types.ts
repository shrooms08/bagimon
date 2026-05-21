export interface BagsCreator {
  isCreator: boolean;
  provider: string | null;
  username: string | null;
  providerUsername: string | null;
  wallet: string;
  pfp: string | null;
  royaltyBps: number;
  twitterUsername?: string;
  bagsUsername?: string;
  isAdmin?: boolean;
}

export interface BagsLifetimeFees {
  lamports: number;
  sol: number;
}
