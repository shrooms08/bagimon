export interface Holder {
  walletAddress: string;
  holdingAmount: number;
  holdingPercentOfSupply: number | null;
}

export interface HolderFetcher {
  readonly name: string;
  readonly available: boolean;
  getTopHolders(mint: string, limit: number): Promise<Holder[]>;
}

export class HolderDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HolderDataError';
  }
}
