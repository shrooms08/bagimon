import 'server-only';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Locate packages/art reliably regardless of where the function runs from.
// On Vercel, Next's outputFileTracingIncludes copies packages/art/ to
// /vercel/path0/packages/art, but __dirname/import.meta.url point inside
// .next/server/... so the old `resolve(here, '../../../../packages/art')`
// trick stops working. Try cwd first, then walk up from this module.
function locateArtRoot(): string {
  const cwdCandidate = join(process.cwd(), 'packages/art');
  if (existsSync(cwdCandidate)) return cwdCandidate;

  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    const candidate = join(dir, 'packages/art');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Could not locate packages/art');
}

let cached: string | null = null;
export function artRoot(): string {
  if (!cached) cached = locateArtRoot();
  return cached;
}

export function artAssetsDir(): string {
  return join(artRoot(), 'assets');
}

export function artTraitsPath(): string {
  return join(artRoot(), 'metadata/traits.json');
}
