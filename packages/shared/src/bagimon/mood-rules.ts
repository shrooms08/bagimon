import type { Mood } from './types.js';

// Tunable thresholds. Will be refined as we observe real Bags coin behavior.
export const MOOD_THRESHOLDS = {
  DYING_VOLUME_USD: 100,
  DYING_DAYS_INACTIVE: 7,
  SICK_PRICE_DROP_PCT: -30,
  THRIVING_VOLUME_USD: 10_000,
  THRIVING_PRICE_PCT: 20,
  THRIVING_MIN_BUYERS: 5,
  HUNGRY_VOLUME_USD: 1_000,
} as const;

export interface MoodInputs {
  priceChange24hPct: number | null;
  volume24hUsd: number | null;
  uniqueBuyers24h: number | null;
  daysSinceActivity: number;
}

export interface MoodResult {
  mood: Mood;
  reason: string;
}

export function computeMood(inputs: MoodInputs): MoodResult {
  const vol = inputs.volume24hUsd ?? 0;
  const price = inputs.priceChange24hPct;
  const buyers = inputs.uniqueBuyers24h ?? 0;
  const days = inputs.daysSinceActivity;

  if (days >= MOOD_THRESHOLDS.DYING_DAYS_INACTIVE && vol < MOOD_THRESHOLDS.DYING_VOLUME_USD) {
    return { mood: 'dying', reason: 'low_activity_7d' };
  }
  if (price !== null && price < MOOD_THRESHOLDS.SICK_PRICE_DROP_PCT) {
    return { mood: 'sick', reason: 'price_drop_30pct' };
  }
  if (
    vol > MOOD_THRESHOLDS.THRIVING_VOLUME_USD &&
    (price ?? 0) > MOOD_THRESHOLDS.THRIVING_PRICE_PCT &&
    buyers > MOOD_THRESHOLDS.THRIVING_MIN_BUYERS
  ) {
    return { mood: 'thriving', reason: 'volume_surge_and_price_up' };
  }
  if (vol < MOOD_THRESHOLDS.HUNGRY_VOLUME_USD && days < MOOD_THRESHOLDS.DYING_DAYS_INACTIVE) {
    return { mood: 'hungry', reason: 'low_volume_24h' };
  }
  return { mood: 'happy', reason: 'default' };
}
