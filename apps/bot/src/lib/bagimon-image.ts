import { AttachmentBuilder } from 'discord.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assembleBagimon,
  loadTraitsConfig,
  mintToSeed,
  selectTraits,
  type Mood,
  type TraitsConfig,
} from '@bagimon/shared';

const here = dirname(fileURLToPath(import.meta.url));
// apps/bot/src/lib/ → packages/art/
const artRoot = resolve(here, '../../../../packages/art');
const ASSETS_DIR = resolve(artRoot, 'assets');
const METADATA_PATH = resolve(artRoot, 'metadata/traits.json');

let cachedConfig: TraitsConfig | null = null;
async function getConfig(): Promise<TraitsConfig> {
  if (!cachedConfig) cachedConfig = await loadTraitsConfig(METADATA_PATH);
  return cachedConfig;
}

export async function renderBagimonAttachment(
  mint: string,
  mood: Mood,
  filename = 'bagimon.png',
): Promise<AttachmentBuilder> {
  const config = await getConfig();
  const seed = mintToSeed(mint);
  const traits = selectTraits(seed, config);
  const png = await assembleBagimon(traits, mood, ASSETS_DIR, config);
  return new AttachmentBuilder(png, { name: filename });
}
