import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { selectTraits, type TraitsConfig } from './traits.js';
import { mintToSeed } from './hash.js';

const CONFIG: TraitsConfig = {
  bodies: [
    { id: 'body_common_a', file: 'a', rarity: 'common' },
    { id: 'body_common_b', file: 'b', rarity: 'common' },
    { id: 'body_uncommon', file: 'c', rarity: 'uncommon' },
    { id: 'body_rare', file: 'd', rarity: 'rare' },
    { id: 'body_legendary', file: 'e', rarity: 'legendary' },
  ],
  eyes: [
    { id: 'eyes_common', file: 'a', rarity: 'common' },
    { id: 'eyes_rare', file: 'b', rarity: 'rare' },
  ],
  mouths: [
    { id: 'mouth_common', file: 'a', rarity: 'common' },
    { id: 'mouth_uncommon', file: 'b', rarity: 'uncommon' },
  ],
  accessories: [
    { id: 'acc_common', file: 'a', rarity: 'common' },
    { id: 'acc_uncommon', file: 'b', rarity: 'uncommon' },
  ],
  moods: [],
};

function seedFromString(s: string): Uint8Array {
  return new Uint8Array(createHash('sha256').update(s).digest());
}

describe('selectTraits', () => {
  it('is deterministic for same seed', () => {
    const seed = mintToSeed('test-mint-1');
    const a = selectTraits(seed, CONFIG);
    const b = selectTraits(seed, CONFIG);
    expect(a).toEqual(b);
  });

  it('produces variation across different seeds', () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const t = selectTraits(seedFromString(`mint-${i}`), CONFIG);
      results.add(`${t.body}|${t.eyes}|${t.mouth}|${t.accessory ?? 'none'}`);
    }
    expect(results.size).toBeGreaterThan(10);
  });

  it('respects rarity weights (rare < common across 1000 samples)', () => {
    const counts: Record<string, number> = {};
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const t = selectTraits(seedFromString(`rng-${i}`), CONFIG);
      counts[t.body] = (counts[t.body] ?? 0) + 1;
    }
    const commonTotal = (counts['body_common_a'] ?? 0) + (counts['body_common_b'] ?? 0);
    const rare = counts['body_rare'] ?? 0;
    const legendary = counts['body_legendary'] ?? 0;
    expect(commonTotal).toBeGreaterThan(rare);
    expect(rare).toBeGreaterThan(legendary);
    // Sanity bounds: weights (50+50):15:5 → common ~66%, rare ~10%, legendary ~3%.
    expect(commonTotal / N).toBeGreaterThan(0.5);
    expect(legendary / N).toBeLessThan(0.12);
  });

  it('omits accessory ~30% of the time', () => {
    let none = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const t = selectTraits(seedFromString(`acc-${i}`), CONFIG);
      if (t.accessory === null) none++;
    }
    const ratio = none / N;
    expect(ratio).toBeGreaterThan(0.2);
    expect(ratio).toBeLessThan(0.4);
  });
});
