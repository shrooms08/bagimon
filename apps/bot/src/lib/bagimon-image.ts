import { AttachmentBuilder } from 'discord.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assembleBagimon,
  DISCORD_OUTPUT_SIZE,
  findSpecies,
  loadTraitsConfig,
  mintToSeed,
  selectTraits,
  type BagimonTraits,
  type Mood,
  type SpeciesEntry,
  type TraitsConfig,
} from '@bagimon/shared';

const here = dirname(fileURLToPath(import.meta.url));
const artRoot = resolve(here, '../../../../packages/art');
const ASSETS_DIR = resolve(artRoot, 'assets');
const METADATA_PATH = resolve(artRoot, 'metadata/traits.json');

let cachedConfig: TraitsConfig | null = null;
async function getConfig(): Promise<TraitsConfig> {
  if (!cachedConfig) cachedConfig = await loadTraitsConfig(METADATA_PATH);
  return cachedConfig;
}

export async function getTraitsConfig(): Promise<TraitsConfig> {
  return getConfig();
}

export function traitsForMint(mint: string, config: TraitsConfig): BagimonTraits {
  return selectTraits(mintToSeed(mint), config);
}

export async function renderBagimonAttachment(
  mint: string,
  mood: Mood,
  filename = 'bagimon.png',
): Promise<{ attachment: AttachmentBuilder; traits: BagimonTraits; species: SpeciesEntry }> {
  const config = await getConfig();
  const traits = traitsForMint(mint, config);
  const png = await assembleBagimon(traits, mood, ASSETS_DIR, config, {
    outputSize: DISCORD_OUTPUT_SIZE,
  });
  const attachment = new AttachmentBuilder(png, { name: filename });
  return { attachment, traits, species: findSpecies(config, traits.species) };
}
