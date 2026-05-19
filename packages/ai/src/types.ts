import type { Mood, SpeciesId } from '@bagimon/shared';

export type { Mood, SpeciesId };

export interface PersonalityContext {
  bagimonId: string;
  species: SpeciesId;
  mood: Mood;
  coinSymbol: string | null;
  coinName: string | null;
  priceChange24hPct: number | null;
  volume24hUsd: number | null;
  recentMoodHistory: { mood: Mood; trigger: string; at: Date }[];
  previousInteractions: {
    petterDisplayName: string;
    response: string;
    at: Date;
  }[];
  petterDisplayName: string;
}

export interface PersonalityResponse {
  text: string;
  source: 'haiku' | 'fallback';
  cost: { inputTokens: number; outputTokens: number; usdEstimate: number } | null;
  latencyMs: number;
  fallbackReason?: string;
}

export type FallbackProvider = (ctx: PersonalityContext) => string;

export interface HaikuCallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface HaikuCallInput {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
}

export type HaikuCaller = (input: HaikuCallInput) => Promise<HaikuCallResult>;
