export type SpeciesId = 'ghotosai' | 'potatiki';
export type Mood = 'happy' | 'hungry' | 'sick' | 'thriving' | 'dying';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export const SPECIES_IDS: readonly SpeciesId[] = ['ghotosai', 'potatiki'] as const;
export const MOODS: readonly Mood[] = ['happy', 'hungry', 'sick', 'thriving', 'dying'] as const;

export interface BagimonTraits {
  species: SpeciesId;
  accessory: string | null;
}

export interface SpeciesEntry {
  id: SpeciesId;
  displayName: string;
  rarity: Rarity;
  lore: string;
}

export interface AccessoryEntry {
  id: string;
  file: string;
  rarity: Rarity;
}

export interface TraitsConfig {
  canvasSize?: number;
  species: SpeciesEntry[];
  accessories: AccessoryEntry[];
}
