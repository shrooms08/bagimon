export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface TraitEntry {
  id: string;
  file: string;
  rarity: Rarity;
}

export interface TraitsConfig {
  bodies: TraitEntry[];
  eyes: TraitEntry[];
  mouths: TraitEntry[];
  accessories: TraitEntry[];
  moods: TraitEntry[];
}

export interface BagimonTraits {
  body: string;
  eyes: string;
  mouth: string;
  accessory: string | null;
}

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
    throw new Error(`seed too short: needed bytes ${offset}..${offset + 3}, got length ${seed.length}`);
  }
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

function unitFloat(seed: Uint8Array, offset: number): number {
  return readUint32(seed, offset) / 0x1_0000_0000;
}

function weightedPick<T extends TraitEntry>(entries: readonly T[], roll: number): T {
  if (entries.length === 0) {
    throw new Error('weightedPick: empty entries');
  }
  const total = entries.reduce((sum, e) => sum + RARITY_WEIGHT[e.rarity], 0);
  let target = roll * total;
  for (const entry of entries) {
    target -= RARITY_WEIGHT[entry.rarity];
    if (target < 0) return entry;
  }
  // Floating-point safety: return last.
  const last = entries[entries.length - 1];
  if (!last) throw new Error('weightedPick: unreachable');
  return last;
}

export function selectTraits(seed: Uint8Array, config: TraitsConfig): BagimonTraits {
  if (seed.length < 20) {
    throw new Error(`selectTraits: seed must be at least 20 bytes, got ${seed.length}`);
  }
  const body = weightedPick(config.bodies, unitFloat(seed, 0));
  const eyes = weightedPick(config.eyes, unitFloat(seed, 4));
  const mouth = weightedPick(config.mouths, unitFloat(seed, 8));
  const accessoryRoll = unitFloat(seed, 12);
  const accessoryPick = weightedPick(config.accessories, unitFloat(seed, 16));
  const accessory = accessoryRoll < ACCESSORY_SKIP_THRESHOLD ? null : accessoryPick.id;
  return {
    body: body.id,
    eyes: eyes.id,
    mouth: mouth.id,
    accessory,
  };
}

export function findTrait(entries: readonly TraitEntry[], id: string): TraitEntry {
  const found = entries.find((e) => e.id === id);
  if (!found) throw new Error(`trait not found: ${id}`);
  return found;
}
