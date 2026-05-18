#!/usr/bin/env tsx
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bs58 from 'bs58';
import {
  loadTraitsConfig,
  mintToSeed,
  selectTraits,
  type TraitsConfig,
} from '../bagimon/index.js';

interface Args {
  count: number;
}

function parseArgs(argv: readonly string[]): Args {
  let count = 1000;
  for (const arg of argv) {
    if (arg.startsWith('--count=')) {
      const raw = arg.slice('--count='.length);
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`invalid --count=${raw}; must be a positive integer`);
      }
      count = parsed;
    } else if (arg.startsWith('--')) {
      throw new Error(`unknown flag: ${arg}`);
    }
  }
  return { count };
}

const RARITY_WEIGHT: Record<string, number> = {
  common: 50,
  uncommon: 30,
  rare: 15,
  legendary: 5,
};
const ACCESSORY_SKIP_THRESHOLD = 0.3;
const DEVIATION_THRESHOLD_PP = 5;

function expectedSpeciesPct(config: TraitsConfig): Map<string, number> {
  const total = config.species.reduce((s, e) => s + RARITY_WEIGHT[e.rarity]!, 0);
  const out = new Map<string, number>();
  for (const s of config.species) {
    out.set(s.id, (RARITY_WEIGHT[s.rarity]! / total) * 100);
  }
  return out;
}

function expectedAccessoryPct(config: TraitsConfig): Map<string, number> {
  const nullPct = ACCESSORY_SKIP_THRESHOLD * 100;
  const nonNullPct = 100 - nullPct;
  const total = config.accessories.reduce((s, e) => s + RARITY_WEIGHT[e.rarity]!, 0);
  const out = new Map<string, number>();
  out.set('(none)', nullPct);
  for (const a of config.accessories) {
    out.set(a.id, (RARITY_WEIGHT[a.rarity]! / total) * nonNullPct);
  }
  return out;
}

function formatTable(
  title: string,
  counts: Map<string, number>,
  expected: Map<string, number>,
  total: number,
): { lines: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const lines: string[] = [];
  lines.push(title);
  lines.push(
    `  ${'Name'.padEnd(14)}${'Count'.padEnd(9)}${'%'.padEnd(8)}${'Expected %'.padEnd(12)}Δ pp`,
  );
  const keys = Array.from(new Set([...expected.keys(), ...counts.keys()]));
  for (const key of keys) {
    const c = counts.get(key) ?? 0;
    const pct = (c / total) * 100;
    const exp = expected.get(key) ?? 0;
    const delta = pct - exp;
    const flag = Math.abs(delta) > DEVIATION_THRESHOLD_PP ? '  WARNING' : '';
    if (flag) {
      warnings.push(
        `${key}: ${pct.toFixed(1)}% vs expected ${exp.toFixed(1)}% (Δ ${delta.toFixed(1)} pp)`,
      );
    }
    lines.push(
      `  ${key.padEnd(14)}${String(c).padEnd(9)}${pct.toFixed(1).padEnd(8)}${exp.toFixed(1).padEnd(12)}${delta >= 0 ? '+' : ''}${delta.toFixed(1)}${flag}`,
    );
  }
  return { lines, warnings };
}

async function main(): Promise<void> {
  const { count } = parseArgs(process.argv.slice(2));
  const here = dirname(fileURLToPath(import.meta.url));
  const metadataPath = resolve(here, '../../../art/metadata/traits.json');
  const config = await loadTraitsConfig(metadataPath);

  const speciesCounts = new Map<string, number>();
  const accessoryCounts = new Map<string, number>();

  for (let i = 0; i < count; i++) {
    const mint = bs58.encode(randomBytes(32));
    const traits = selectTraits(mintToSeed(mint), config);
    speciesCounts.set(traits.species, (speciesCounts.get(traits.species) ?? 0) + 1);
    const accKey = traits.accessory ?? '(none)';
    accessoryCounts.set(accKey, (accessoryCounts.get(accKey) ?? 0) + 1);
  }

  console.info(`Sample size: ${count} randomly generated base58 mints\n`);
  const sp = formatTable(
    'Species distribution:',
    speciesCounts,
    expectedSpeciesPct(config),
    count,
  );
  console.info(sp.lines.join('\n'));
  console.info('');
  const ac = formatTable(
    'Accessory distribution:',
    accessoryCounts,
    expectedAccessoryPct(config),
    count,
  );
  console.info(ac.lines.join('\n'));

  const allWarnings = [...sp.warnings, ...ac.warnings];
  if (allWarnings.length > 0) {
    console.info(`\nWARNINGS (deviation > ${DEVIATION_THRESHOLD_PP} pp):`);
    for (const w of allWarnings) console.info(`  - ${w}`);
    process.exitCode = 1;
  } else {
    console.info(`\nAll distributions within ±${DEVIATION_THRESHOLD_PP} pp of expected.`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
