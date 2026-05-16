import { createHash } from 'node:crypto';

export function mintToSeed(mint: string): Uint8Array {
  const trimmed = mint.trim();
  if (trimmed.length === 0) {
    throw new Error('mintToSeed: mint must be a non-empty string');
  }
  const digest = createHash('sha256').update(trimmed, 'utf8').digest();
  return new Uint8Array(digest);
}
