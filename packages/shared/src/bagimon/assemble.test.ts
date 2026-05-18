import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { assembleBagimon, CANVAS_SIZE } from './assemble.js';
import { loadTraitsConfig } from './config.js';
import { MOODS } from './types.js';
import type { TraitsConfig } from './types.js';

const here = dirname(fileURLToPath(import.meta.url));
const artRoot = resolve(here, '../../../art');
const assetsDir = resolve(artRoot, 'assets');
const metadataPath = resolve(artRoot, 'metadata/traits.json');

const hasGhotosai = existsSync(resolve(assetsDir, 'species/ghotosai/happy.png'));
const hasPotatiki = existsSync(resolve(assetsDir, 'species/potatiki/thriving.png'));
const hasAssets = existsSync(metadataPath) && hasGhotosai && hasPotatiki;
const describeIfAssets = hasAssets ? describe : describe.skip;

describeIfAssets('assembleBagimon', () => {
  let config: TraitsConfig;

  beforeAll(async () => {
    config = await loadTraitsConfig(metadataPath);
  });

  it('canvas is 64x64', () => {
    expect(CANVAS_SIZE).toBe(64);
  });

  it('produces a 64x64 PNG for ghotosai happy', async () => {
    const png = await assembleBagimon(
      { species: 'ghotosai', accessory: null },
      'happy',
      assetsDir,
      config,
    );
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(64);
    expect(meta.height).toBe(64);
    expect(meta.format).toBe('png');
  });

  it('produces a 64x64 PNG for potatiki thriving', async () => {
    const png = await assembleBagimon(
      { species: 'potatiki', accessory: null },
      'thriving',
      assetsDir,
      config,
    );
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(64);
    expect(meta.height).toBe(64);
  });

  it('layers accessory on top of species', async () => {
    const without = await assembleBagimon(
      { species: 'ghotosai', accessory: null },
      'happy',
      assetsDir,
      config,
    );
    const withAcc = await assembleBagimon(
      { species: 'ghotosai', accessory: 'partyhat' },
      'happy',
      assetsDir,
      config,
    );
    expect(Buffer.compare(without, withAcc)).not.toBe(0);
  });

  it('works for all moods', async () => {
    for (const mood of MOODS) {
      const png = await assembleBagimon(
        { species: 'ghotosai', accessory: null },
        mood,
        assetsDir,
        config,
      );
      expect(png.length).toBeGreaterThan(0);
    }
  });

  it('handles missing accessory gracefully', async () => {
    const png = await assembleBagimon(
      { species: 'potatiki', accessory: null },
      'happy',
      assetsDir,
      config,
    );
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(64);
  });
});
