import 'server-only';
import path from 'node:path';

// Art assets are copied into apps/web/public/_art/ by scripts/copy-art.mjs
// at prebuild/predev time. Next.js automatically bundles public/ contents
// into the Vercel serverless function deployment, so this path is stable
// across local dev and Vercel runtime.
const ART_ROOT = path.join(process.cwd(), 'public/_art');

export function artRoot(): string {
  return ART_ROOT;
}

export function artAssetsDir(): string {
  return path.join(ART_ROOT, 'assets');
}

export function artTraitsPath(): string {
  return path.join(ART_ROOT, 'metadata/traits.json');
}
