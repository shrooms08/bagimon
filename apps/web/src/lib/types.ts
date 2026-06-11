import type { Mood, SpeciesId } from '@bagimon/shared';

export interface PetdexBagimon {
  id: string;
  species: SpeciesId;
  speciesDisplayName: string;
  speciesType: string;
  speciesLore: string;
  petdexNumber: string;
  coinMint: string;
  coinSymbol: string | null;
  coinName: string | null;
  currentMood: Mood;
  isAlive: boolean;
  diedAt: Date | null;
  finalMood: Mood | null;
  finalPriceUsd: number | null;
  finalVolume24hUsd: number | null;
  bornAt: Date;
  ageDays: number;
  lifespanDays: number;
  priceUsd: number | null;
  priceChange24hPct: number | null;
  volume24hUsd: number | null;
  lastStatsAt: Date | null;
  lifetimeFeesSol: number | null;
  creator: PetdexCreator | null;
  timesFed: number;
  timesPet: number;
  lastFedBy: string | null;
  ownerWallet: string | null;
  claimedAt: Date | null;
  createdVia: 'discord' | 'web';
}

export interface PetdexCreator {
  provider: string | null;
  username: string | null;
  providerUsername: string | null;
  wallet: string;
  pfp: string | null;
  royaltyBps: number | null;
}

export interface PetdexMoodSegment {
  mood: Mood;
  startedAt: Date;
  reason: string;
}

export interface PetdexInteraction {
  responseText: string;
  // Discord display name (web rows have null); for web rows, actorWallet is set.
  petterDisplayName: string | null;
  channel: 'discord' | 'web';
  actorWallet: string | null;
  action: 'pet' | 'feed';
  createdAt: Date;
}

export interface PetdexParent {
  rank: number;
  walletAddress: string;
  holdingAmount: number;
  holdingPercentOfSupply: number | null;
  snapshotAt: Date;
}

export interface PetdexData {
  bagimon: PetdexBagimon;
  moodHistory: PetdexMoodSegment[];
  interactions: PetdexInteraction[];
  parents: PetdexParent[];
}
