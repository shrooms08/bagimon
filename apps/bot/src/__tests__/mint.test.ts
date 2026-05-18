import { describe, expect, it } from 'vitest';
import { isLikelyMint, shortMint } from '../lib/mint.js';

describe('isLikelyMint', () => {
  it('accepts a typical Solana mint', () => {
    expect(isLikelyMint('So11111111111111111111111111111111111111112')).toBe(true);
  });
  it('rejects too-short strings', () => {
    expect(isLikelyMint('abc')).toBe(false);
  });
  it('rejects strings with invalid base58 chars', () => {
    expect(isLikelyMint('0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl')).toBe(false);
  });
});

describe('shortMint', () => {
  it('shortens long mints', () => {
    expect(shortMint('So11111111111111111111111111111111111111112')).toBe('So11…1112');
  });
  it('passes short input through', () => {
    expect(shortMint('abc')).toBe('abc');
  });
});
