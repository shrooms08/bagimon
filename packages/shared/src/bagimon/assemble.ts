import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { BagimonTraits, TraitsConfig } from './traits.js';
import { findTrait } from './traits.js';
import type { Mood } from './mood.js';
import { moodAssetId } from './mood.js';

export const CANVAS_SIZE = 256;

async function loadLayer(assetsDir: string, file: string): Promise<Buffer> {
  return readFile(join(assetsDir, file));
}

export async function assembleBagimon(
  traits: BagimonTraits,
  mood: Mood,
  assetsDir: string,
  config: TraitsConfig,
): Promise<Buffer> {
  const layerFiles: string[] = [
    findTrait(config.bodies, traits.body).file,
    findTrait(config.mouths, traits.mouth).file,
    findTrait(config.eyes, traits.eyes).file,
  ];
  if (traits.accessory !== null) {
    layerFiles.push(findTrait(config.accessories, traits.accessory).file);
  }
  layerFiles.push(findTrait(config.moods, moodAssetId(mood)).file);

  const layers = await Promise.all(layerFiles.map((f) => loadLayer(assetsDir, f)));

  const base = sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  return base
    .composite(layers.map((input) => ({ input, top: 0, left: 0 })))
    .png()
    .toBuffer();
}
