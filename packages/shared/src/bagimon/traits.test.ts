import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { selectTraits } from './traits.js';
import type { TraitsConfig } from './types.js';
import { mintToSeed } from './hash.js';

const CONFIG: TraitsConfig = {
  species: [
    { id: 'ghotosai', displayName: 'Ghotosai', rarity: 'common', lore: 'a' },
    { id: 'potatiki', displayName: 'Potatiki', rarity: 'common', lore: 'b' },
  ],
  accessories: [
    { id: 'glasses', file: 'accessories/glasses.png', rarity: 'common' },
    { id: 'eyepatch', file: 'accessories/eyepatch.png', rarity: 'uncommon' },
    { id: 'partyhat', file: 'accessories/partyhat.png', rarity: 'rare' },
  ],
};

function seedFromString(s: string): Uint8Array {
  return new Uint8Array(createHash('sha256').update(s).digest());
}

describe('selectTraits', () => {
  it('is deterministic for same seed', () => {
    const seed = mintToSeed('test-mint-1');
    expect(selectTraits(seed, CONFIG)).toEqual(selectTraits(seed, CONFIG));
  });

  it('produces variation across different seeds', () => {
    const combos = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const t = selectTraits(seedFromString(`mint-${i}`), CONFIG);
      combos.add(`${t.species}|${t.accessory ?? 'none'}`);
    }
    expect(combos.size).toBeGreaterThan(4);
  });

  it('respects rarity weights for accessories (common > uncommon > rare)', () => {
    const counts: Record<string, number> = { glasses: 0, eyepatch: 0, partyhat: 0 };
    const N = 2000;
    for (let i = 0; i < N; i++) {
      const t = selectTraits(seedFromString(`rng-${i}`), CONFIG);
      if (t.accessory) counts[t.accessory] = (counts[t.accessory] ?? 0) + 1;
    }
    expect(counts['glasses']).toBeGreaterThan(counts['eyepatch'] ?? 0);
    expect(counts['eyepatch']).toBeGreaterThan(counts['partyhat'] ?? 0);
  });

  it('omits accessory ~30% of the time', () => {
    let none = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      if (selectTraits(seedFromString(`acc-${i}`), CONFIG).accessory === null) none++;
    }
    const ratio = none / N;
    expect(ratio).toBeGreaterThan(0.22);
    expect(ratio).toBeLessThan(0.38);
  });

  it('picks both species across many seeds', () => {
    const species = new Set<string>();
    for (let i = 0; i < 100; i++) {
      species.add(selectTraits(seedFromString(`sp-${i}`), CONFIG).species);
    }
    expect(species.has('ghotosai')).toBe(true);
    expect(species.has('potatiki')).toBe(true);
  });
});
