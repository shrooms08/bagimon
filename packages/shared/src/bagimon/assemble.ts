import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { BagimonTraits, Mood, TraitsConfig } from './types.js';
import { findAccessory } from './traits.js';

export const CANVAS_SIZE = 64;
export const DISCORD_OUTPUT_SIZE = 512;

export async function assembleBagimon(
  traits: BagimonTraits,
  mood: Mood,
  assetsDir: string,
  config: TraitsConfig,
  options: { outputSize?: number } = {},
): Promise<Buffer> {
  const outputSize = options.outputSize ?? CANVAS_SIZE;
  const speciesFile = join(assetsDir, 'species', traits.species, `${mood}.png`);
  const layers: Buffer[] = [await readFile(speciesFile)];

  if (traits.accessory !== null) {
    const acc = findAccessory(config, traits.accessory);
    layers.push(await readFile(join(assetsDir, acc.file)));
  }

  const base = sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const composed = await base
    .composite(layers.map((input) => ({ input, top: 0, left: 0 })))
    .png()
    .toBuffer();

  if (outputSize === CANVAS_SIZE) return composed;

  // Nearest-neighbor upscale so pixel boundaries stay crisp at Discord render sizes.
  return sharp(composed)
    .resize(outputSize, outputSize, { kernel: 'nearest', fit: 'fill' })
    .png()
    .toBuffer();
}
