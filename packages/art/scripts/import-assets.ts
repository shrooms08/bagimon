#!/usr/bin/env tsx
import { mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const EXPECTED_MOODS = ['happy', 'hungry', 'sick', 'thriving', 'dying'] as const;
const SPECIES = ['ghotosai', 'potatiki'] as const;
const ACCESSORIES = ['eyepatch.png', 'glasses.png', 'partyhat.png'] as const;
const GHOTOSAI_EXTRA: Record<string, string> = { 'sadGhost.png': 'sad.png' };
const EXPECTED_SIZE = 64;

const here = dirname(fileURLToPath(import.meta.url));
const artRoot = resolve(here, '..');
const destAssets = resolve(artRoot, 'assets');
const sourceDir =
  process.env['BAGIMON_SOURCE_ASSETS_DIR'] ?? '/Users/minos/Documents/bagimon-assets';

let warnings = 0;
let copied = 0;

function warn(msg: string): void {
  warnings++;
  console.warn(`warn: ${msg}`);
}

async function exists(p: string): Promise<boolean> {
  try {
    await readdir(p);
    return true;
  } catch {
    return false;
  }
}

// Source PNGs are typically exported at an integer multiple of 64 (e.g. 640x640
// from Pixelorama). Downscale with nearest-neighbour so the pixel grid stays
// crisp. Non-square or non-integer-multiple sources get a warning but still
// resize.
async function copyAndValidate(from: string, to: string): Promise<void> {
  await mkdir(dirname(to), { recursive: true });
  const img = sharp(from);
  const meta = await img.metadata();
  if (meta.width !== meta.height) {
    warn(`${from} is ${meta.width}x${meta.height} (not square); will stretch to ${EXPECTED_SIZE}x${EXPECTED_SIZE}`);
  } else if (meta.width !== EXPECTED_SIZE && meta.width !== undefined && meta.width % EXPECTED_SIZE !== 0) {
    warn(`${from} is ${meta.width}px (not a multiple of ${EXPECTED_SIZE}); pixel grid may smear`);
  }
  await img
    .resize(EXPECTED_SIZE, EXPECTED_SIZE, { kernel: 'nearest', fit: 'fill' })
    .png()
    .toFile(to);
  copied++;
  console.info(`imported ${from} → ${to} (${meta.width}x${meta.height} → ${EXPECTED_SIZE}x${EXPECTED_SIZE})`);
}

async function importSpecies(species: string): Promise<void> {
  const srcDir = join(sourceDir, species);
  if (!(await exists(srcDir))) {
    warn(`species source missing: ${srcDir}`);
    return;
  }
  const destDir = join(destAssets, 'species', species);
  await rm(destDir, { recursive: true, force: true });
  await mkdir(destDir, { recursive: true });

  const entries = await readdir(srcDir);
  const moods = new Set(entries);
  for (const mood of EXPECTED_MOODS) {
    const fname = `${mood}.png`;
    if (!moods.has(fname)) {
      warn(`${species} missing required mood: ${fname}`);
      continue;
    }
    await copyAndValidate(join(srcDir, fname), join(destDir, fname));
  }

  if (species === 'ghotosai') {
    for (const [srcName, destName] of Object.entries(GHOTOSAI_EXTRA)) {
      if (moods.has(srcName)) {
        await copyAndValidate(join(srcDir, srcName), join(destDir, destName));
      }
    }
  }
}

async function importAccessories(): Promise<void> {
  const srcDir = join(sourceDir, 'accessories');
  if (!(await exists(srcDir))) {
    warn(`accessories source missing: ${srcDir}`);
    return;
  }
  const destDir = join(destAssets, 'accessories');
  await rm(destDir, { recursive: true, force: true });
  await mkdir(destDir, { recursive: true });
  for (const f of ACCESSORIES) {
    const src = join(srcDir, f);
    try {
      await copyAndValidate(src, join(destDir, f));
    } catch (err) {
      warn(`accessory ${f} not copied: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function cleanOldDirs(): Promise<void> {
  for (const old of ['bodies', 'eyes', 'mouths', 'moods']) {
    await rm(join(destAssets, old), { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  console.info(`importing from ${sourceDir}`);
  await mkdir(destAssets, { recursive: true });
  await cleanOldDirs();
  for (const sp of SPECIES) await importSpecies(sp);
  await importAccessories();
  console.info(`\ndone. copied ${copied} files, ${warnings} warning(s).`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
