import 'server-only';
import {
  assembleBagimon,
  loadTraitsConfig,
  mintToSeed,
  selectTraits,
  type Mood,
  type TraitsConfig,
} from '@bagimon/shared';
import { artAssetsDir, artTraitsPath } from './art-root';

let cached: TraitsConfig | null = null;
async function getConfig(): Promise<TraitsConfig> {
  if (!cached) cached = await loadTraitsConfig(artTraitsPath());
  return cached;
}

export async function renderBagimonPng(mint: string, mood: Mood, outputSize = 512): Promise<Buffer> {
  const config = await getConfig();
  const traits = selectTraits(mintToSeed(mint), config);
  return assembleBagimon(traits, mood, artAssetsDir(), config, { outputSize });
}
