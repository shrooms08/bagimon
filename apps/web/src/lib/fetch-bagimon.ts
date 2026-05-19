import 'server-only';
import { loadTraitsConfig, findSpecies, mintToSeed, selectTraits, SPECIES_TYPE, type Mood, type SpeciesId, type TraitsConfig } from '@bagimon/shared';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BagimonSupabaseClient } from '@bagimon/db';
import { getSupabase } from './supabase';
import { bornAtLabel, dayCount, petdexNumber } from './format';
import type { PetdexData, PetdexInteraction, PetdexMoodSegment } from './types';

const here = dirname(fileURLToPath(import.meta.url));
// apps/web/src/lib → repo root → packages/art/metadata/traits.json
const traitsPath = resolve(here, '../../../../packages/art/metadata/traits.json');

let cachedTraits: TraitsConfig | null = null;
async function getTraits(): Promise<TraitsConfig> {
  if (!cachedTraits) cachedTraits = await loadTraitsConfig(traitsPath);
  return cachedTraits;
}

export async function fetchBagimonForPetdex(bagimonId: string): Promise<PetdexData | null> {
  const supabase = getSupabase();
  return fetchBagimonForPetdexWith(supabase, bagimonId);
}

// Exported for tests so we can inject a mock client.
export async function fetchBagimonForPetdexWith(
  supabase: BagimonSupabaseClient,
  bagimonId: string,
): Promise<PetdexData | null> {
  // We don't catch errors — let them propagate so Next.js renders an error
  // boundary instead of a confusing 404.
  const { data: bagimon, error } = await supabase
    .from('bagimons')
    .select()
    .eq('id', bagimonId)
    .maybeSingle();
  if (error) throw new Error(`fetch bagimon failed: ${error.message}`);
  if (!bagimon) return null;

  const [{ data: moodRows, error: moodErr }, { data: interactionRows, error: intErr }] =
    await Promise.all([
      supabase
        .from('mood_transitions')
        .select()
        .eq('bagimon_id', bagimonId)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('interactions')
        .select()
        .eq('bagimon_id', bagimonId)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);
  if (moodErr) throw new Error(`fetch mood history failed: ${moodErr.message}`);
  if (intErr) throw new Error(`fetch interactions failed: ${intErr.message}`);

  const traits = await getTraits();
  // Identity is derived from the mint, not stored.
  const derived = selectTraits(mintToSeed(bagimon.coin_mint), traits);
  const species = findSpecies(traits, derived.species);
  const bornAt = new Date(bagimon.born_at);

  const moodHistory: PetdexMoodSegment[] = (moodRows ?? []).map((row) => ({
    mood: row.to_mood,
    startedAt: new Date(row.created_at),
    reason: row.trigger_reason ?? 'unknown',
  }));

  const interactions: PetdexInteraction[] = (interactionRows ?? []).map((row) => ({
    responseText: row.response_text,
    petterDisplayName: row.petter_discord_display_name,
    createdAt: new Date(row.created_at),
  }));

  return {
    bagimon: {
      id: bagimon.id,
      species: derived.species as SpeciesId,
      speciesDisplayName: species.displayName,
      speciesType: SPECIES_TYPE[derived.species],
      speciesLore: species.lore,
      petdexNumber: petdexNumber(bagimon.id),
      coinMint: bagimon.coin_mint,
      coinSymbol: bagimon.coin_symbol,
      coinName: bagimon.coin_name,
      currentMood: bagimon.current_mood as Mood,
      isAlive: bagimon.is_alive,
      bornAt,
      ageDays: dayCount(bornAt),
      priceUsd: bagimon.last_price_usd,
      priceChange24hPct: bagimon.last_price_change_24h_pct,
      volume24hUsd: bagimon.last_volume24h_usd,
      lastStatsAt: bagimon.last_stats_at ? new Date(bagimon.last_stats_at) : null,
    },
    moodHistory,
    interactions,
  };
}

export { bornAtLabel };
