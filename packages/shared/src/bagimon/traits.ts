import type {
  AccessoryEntry,
  BagimonTraits,
  Rarity,
  SpeciesEntry,
  SpeciesId,
  TraitsConfig,
} from './types.js';

export type { BagimonTraits, TraitsConfig, Rarity, SpeciesEntry, AccessoryEntry, SpeciesId } from './types.js';

const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 50,
  uncommon: 30,
  rare: 15,
  legendary: 5,
};

const ACCESSORY_SKIP_THRESHOLD = 0.3;

function readUint32(seed: Uint8Array, offset: number): number {
  const a = seed[offset];
  const b = seed[offset + 1];
  const c = seed[offset + 2];
  const d = seed[offset + 3];
  if (a === undefined || b === undefined || c === undefined || d === undefined) {
    throw new Error(
      `seed too short: needed bytes ${offset}..${offset + 3}, got length ${seed.length}`,
    );
  }
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

function unitFloat(seed: Uint8Array, offset: number): number {
  return readUint32(seed, offset) / 0x1_0000_0000;
}

interface WeightedEntry {
  rarity: Rarity;
}

function weightedPick<T extends WeightedEntry>(entries: readonly T[], roll: number): T {
  if (entries.length === 0) {
    throw new Error('weightedPick: empty entries');
  }
  const total = entries.reduce((sum, e) => sum + RARITY_WEIGHT[e.rarity], 0);
  let target = roll * total;
  for (const entry of entries) {
    target -= RARITY_WEIGHT[entry.rarity];
    if (target < 0) return entry;
  }
  const last = entries[entries.length - 1];
  if (!last) throw new Error('weightedPick: unreachable');
  return last;
}

// Seed byte budget:
//   0-3   species selection
//   4-7   accessory skip roll (~30% chance of no accessory)
//   8-11  accessory selection
//   12-31 RESERVED — do not consume without a migration plan
export function selectTraits(seed: Uint8Array, config: TraitsConfig): BagimonTraits {
  if (seed.length < 12) {
    throw new Error(`selectTraits: seed must be at least 12 bytes, got ${seed.length}`);
  }
  const species = weightedPick(config.species, unitFloat(seed, 0));
  const accessorySkip = unitFloat(seed, 4);
  const hasAccessory = accessorySkip >= ACCESSORY_SKIP_THRESHOLD && config.accessories.length > 0;
  const accessory = hasAccessory
    ? weightedPick(config.accessories, unitFloat(seed, 8)).id
    : null;
  return {
    species: species.id,
    accessory,
  };
}

export function findSpecies(config: TraitsConfig, id: SpeciesId): SpeciesEntry {
  const found = config.species.find((s) => s.id === id);
  if (!found) throw new Error(`species not found: ${id}`);
  return found;
}

export function findAccessory(config: TraitsConfig, id: string): AccessoryEntry {
  const found = config.accessories.find((a) => a.id === id);
  if (!found) throw new Error(`accessory not found: ${id}`);
  return found;
}
