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
  petterDisplayName: string;
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
