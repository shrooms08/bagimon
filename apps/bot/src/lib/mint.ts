// Base58 alphabet check is enough for v1 — a true decode happens in Phase 3
// when we resolve coin metadata.
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isLikelyMint(input: string): boolean {
  return BASE58_RE.test(input);
}

export function shortMint(mint: string): string {
  if (mint.length <= 9) return mint;
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}
