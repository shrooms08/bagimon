import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { assembleBagimon, CANVAS_SIZE } from './assemble.js';
import { loadTraitsConfig } from './config.js';
import { MOODS } from './mood.js';
import { mintToSeed } from './hash.js';
import { selectTraits, type TraitsConfig } from './traits.js';

const here = dirname(fileURLToPath(import.meta.url));
const artRoot = resolve(here, '../../../art');
const assetsDir = resolve(artRoot, 'assets');
const metadataPath = resolve(artRoot, 'metadata/traits.json');

const hasAssets = existsSync(assetsDir) && existsSync(metadataPath);
const describeIfAssets = hasAssets ? describe : describe.skip;

describeIfAssets('assembleBagimon', () => {
  let config: TraitsConfig;

  beforeAll(async () => {
    config = await loadTraitsConfig(metadataPath);
  });

  it('produces a 256x256 PNG for happy mood', async () => {
    const seed = mintToSeed('So11111111111111111111111111111111111111112');
    const traits = selectTraits(seed, config);
    const png = await assembleBagimon(traits, 'happy', assetsDir, config);
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(CANVAS_SIZE);
    expect(meta.height).toBe(CANVAS_SIZE);
    expect(meta.format).toBe('png');
  });

  it('works for all moods', async () => {
    const seed = mintToSeed('mood-mint');
    const traits = selectTraits(seed, config);
    for (const mood of MOODS) {
      const png = await assembleBagimon(traits, mood, assetsDir, config);
      expect(png.length).toBeGreaterThan(0);
    }
  });

  it('handles missing accessory gracefully', async () => {
    const seed = mintToSeed('no-accessory-test');
    const traits = selectTraits(seed, config);
    const variant = { ...traits, accessory: null };
    const png = await assembleBagimon(variant, 'happy', assetsDir, config);
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(CANVAS_SIZE);
    expect(meta.height).toBe(CANVAS_SIZE);
  });
});
