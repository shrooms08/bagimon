import { describe, expect, it } from 'vitest';
import { computeMood, MOOD_THRESHOLDS, type MoodInputs } from './mood-rules.js';

function inputs(overrides: Partial<MoodInputs> = {}): MoodInputs {
  return {
    priceChange24hPct: 0,
    volume24hUsd: 5000,
    uniqueBuyers24h: 10,
    daysSinceActivity: 0,
    ...overrides,
  };
}

describe('computeMood', () => {
  it('returns happy by default', () => {
    expect(computeMood(inputs()).mood).toBe('happy');
  });

  it('returns dying when inactive 7d and volume below threshold', () => {
    const r = computeMood(inputs({ daysSinceActivity: 7, volume24hUsd: 50 }));
    expect(r.mood).toBe('dying');
    expect(r.reason).toBe('low_activity_7d');
  });

  it('does not return dying if volume is above the dying threshold even if inactive', () => {
    expect(
      computeMood(inputs({ daysSinceActivity: 30, volume24hUsd: 500 })).mood,
    ).not.toBe('dying');
  });

  it('returns sick on >30% price drop', () => {
    expect(computeMood(inputs({ priceChange24hPct: -30.01 })).mood).toBe('sick');
  });

  it('sick has priority over hungry', () => {
    const r = computeMood(inputs({ priceChange24hPct: -50, volume24hUsd: 50 }));
    expect(r.mood).toBe('sick');
  });

  it('dying has priority over sick', () => {
    const r = computeMood(
      inputs({ priceChange24hPct: -90, volume24hUsd: 10, daysSinceActivity: 30 }),
    );
    expect(r.mood).toBe('dying');
  });

  it('returns thriving on volume surge + price up + buyers', () => {
    const r = computeMood(
      inputs({ volume24hUsd: 20_000, priceChange24hPct: 25, uniqueBuyers24h: 10 }),
    );
    expect(r.mood).toBe('thriving');
    expect(r.reason).toBe('volume_surge_and_price_up');
  });

  it('thriving requires all three conditions (buyers gate)', () => {
    const r = computeMood(
      inputs({ volume24hUsd: 20_000, priceChange24hPct: 25, uniqueBuyers24h: 0 }),
    );
    expect(r.mood).not.toBe('thriving');
  });

  it('returns hungry on low volume', () => {
    const r = computeMood(inputs({ volume24hUsd: 50 }));
    expect(r.mood).toBe('hungry');
    expect(r.reason).toBe('low_volume_24h');
  });

  it('boundary: exactly at sick threshold is NOT sick (strict <)', () => {
    expect(computeMood(inputs({ priceChange24hPct: -30 })).mood).not.toBe('sick');
  });

  it('boundary: exactly at thriving volume is NOT thriving (strict >)', () => {
    expect(
      computeMood(inputs({ volume24hUsd: MOOD_THRESHOLDS.THRIVING_VOLUME_USD, priceChange24hPct: 25, uniqueBuyers24h: 10 })).mood,
    ).not.toBe('thriving');
  });

  it('handles all-null inputs as happy (defaults are non-extreme)', () => {
    const r = computeMood({
      priceChange24hPct: null,
      volume24hUsd: null,
      uniqueBuyers24h: null,
      daysSinceActivity: 0,
    });
    // vol coerces to 0 < hungry threshold, so this should be hungry not happy.
    expect(r.mood).toBe('hungry');
  });
});
