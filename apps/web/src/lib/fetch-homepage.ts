import 'server-only';
import type { Mood, SpeciesId } from '@bagimon/shared';
import { findSpecies, loadTraitsConfig, mintToSeed, selectTraits, type TraitsConfig } from '@bagimon/shared';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BagimonSupabaseClient } from '@bagimon/db';
import { getSupabase } from './supabase';

export interface HomepageBagimon {
  id: string;
  species: SpeciesId;
  speciesDisplayName: string;
  coinSymbol: string | null;
  currentMood: Mood;
}

const here = dirname(fileURLToPath(import.meta.url));
const traitsPath = resolve(here, '../../../../packages/art/metadata/traits.json');

let cachedTraits: TraitsConfig | null = null;
async function getTraits(): Promise<TraitsConfig> {
  if (!cachedTraits) cachedTraits = await loadTraitsConfig(traitsPath);
  return cachedTraits;
}

export async function fetchLiveBagimonsForHomepage(limit = 4): Promise<HomepageBagimon[]> {
  return fetchLiveBagimonsForHomepageWith(getSupabase(), limit);
}

export async function fetchLiveBagimonsForHomepageWith(
  supabase: BagimonSupabaseClient,
  limit = 4,
): Promise<HomepageBagimon[]> {
  const { data, error } = await supabase
    .from('bagimons')
    .select()
    .eq('is_alive', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`fetch homepage bagimons failed: ${error.message}`);
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const traits = await getTraits();
  return rows.map((row) => {
    const derived = selectTraits(mintToSeed(row.coin_mint), traits);
    const species = findSpecies(traits, derived.species);
    return {
      id: row.id,
      species: derived.species as SpeciesId,
      speciesDisplayName: species.displayName,
      coinSymbol: row.coin_symbol,
      currentMood: row.current_mood as Mood,
    };
  });
}
