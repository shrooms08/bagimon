import 'server-only';
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
const artRoot = resolve(here, '../../../../packages/art');
const ASSETS_DIR = resolve(artRoot, 'assets');
const TRAITS_PATH = resolve(artRoot, 'metadata/traits.json');

let cached: TraitsConfig | null = null;
async function getConfig(): Promise<TraitsConfig> {
  if (!cached) cached = await loadTraitsConfig(TRAITS_PATH);
  return cached;
}

export async function renderBagimonPng(mint: string, mood: Mood, outputSize = 512): Promise<Buffer> {
  const config = await getConfig();
  const traits = selectTraits(mintToSeed(mint), config);
  return assembleBagimon(traits, mood, ASSETS_DIR, config, { outputSize });
}
