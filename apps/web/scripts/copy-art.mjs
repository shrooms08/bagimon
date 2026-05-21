import { mkdir, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, '..');
const monorepoRoot = join(projectRoot, '../..');

const SRC_ART = join(monorepoRoot, 'packages/art');
const DEST_ART = join(projectRoot, 'public/_art');

async function main() {
  if (!existsSync(SRC_ART)) {
    throw new Error(`Source art directory not found: ${SRC_ART}`);
  }

  console.log(`Copying art assets...`);
  console.log(`  from: ${SRC_ART}`);
  console.log(`  to:   ${DEST_ART}`);

  await rm(DEST_ART, { recursive: true, force: true });
  await mkdir(DEST_ART, { recursive: true });

  await cp(join(SRC_ART, 'assets'), join(DEST_ART, 'assets'), { recursive: true });
  await cp(join(SRC_ART, 'metadata'), join(DEST_ART, 'metadata'), { recursive: true });

  console.log('✓ Art assets copied successfully');
}

main().catch((err) => {
  console.error('✗ Failed to copy art:', err);
  process.exit(1);
});
