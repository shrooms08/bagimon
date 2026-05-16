import { readFile } from 'node:fs/promises';
import type { TraitsConfig } from './traits.js';

export async function loadTraitsConfig(metadataPath: string): Promise<TraitsConfig> {
  const raw = await readFile(metadataPath, 'utf8');
  return JSON.parse(raw) as TraitsConfig;
}
