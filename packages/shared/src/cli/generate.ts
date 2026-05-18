#!/usr/bin/env tsx
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bs58 from 'bs58';
import {
  mintToSeed,
  selectTraits,
  assembleBagimon,
  loadTraitsConfig,
  MOODS,
  type Mood,
} from '../bagimon/index.js';

interface CliArgs {
  mint: string;
  mood: Mood;
  out: string;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const positional: string[] = [];
  let mood: Mood = 'happy';
  let out = './bagimon.png';
  for (const arg of argv) {
    if (arg.startsWith('--mood=')) {
      const value = arg.slice('--mood='.length);
      if (!(MOODS as readonly string[]).includes(value)) {
        throw new Error(`invalid --mood=${value}; expected one of ${MOODS.join(', ')}`);
      }
      mood = value as Mood;
    } else if (arg.startsWith('--out=')) {
      out = arg.slice('--out='.length);
    } else if (arg.startsWith('--')) {
      throw new Error(`unknown flag: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  const mint = positional[0];
  if (!mint) {
    throw new Error('usage: generate <mint-address> [--mood=happy] [--out=./bagimon.png]');
  }
  return { mint, mood, out };
}

function validateMint(mint: string): void {
  try {
    const decoded = bs58.decode(mint);
    if (decoded.length !== 32) {
      console.warn(`warning: decoded mint is ${decoded.length} bytes, expected 32 (continuing)`);
    }
  } catch {
    console.warn('warning: mint is not valid base58 (continuing — hash works on raw string)');
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  validateMint(args.mint);

  const here = dirname(fileURLToPath(import.meta.url));
  // packages/shared/src/cli/ → packages/art/
  const artRoot = resolve(here, '../../../art');
  const assetsDir = resolve(artRoot, 'assets');
  const metadataPath = resolve(artRoot, 'metadata/traits.json');

  const config = await loadTraitsConfig(metadataPath);
  const seed = mintToSeed(args.mint);
  const traits = selectTraits(seed, config);

  const png = await assembleBagimon(traits, args.mood, assetsDir, config);

  const outPath = resolve(process.cwd(), args.out);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, png);

  console.info(
    JSON.stringify(
      {
        mint: args.mint,
        mood: args.mood,
        species: traits.species,
        accessory: traits.accessory,
        out: outPath,
        bytes: png.length,
      },
      null,
      2,
    ),
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
