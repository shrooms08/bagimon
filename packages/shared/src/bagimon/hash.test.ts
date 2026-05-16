import { describe, it, expect } from 'vitest';
import { mintToSeed } from './hash.js';

describe('mintToSeed', () => {
  it('is deterministic: same mint → same hash', () => {
    const mint = 'So11111111111111111111111111111111111111112';
    const a = mintToSeed(mint);
    const b = mintToSeed(mint);
    expect(Buffer.from(a).toString('hex')).toBe(Buffer.from(b).toString('hex'));
  });

  it('produces 32 bytes', () => {
    expect(mintToSeed('any-mint').length).toBe(32);
  });

  it('different mints produce different hashes', () => {
    const a = Buffer.from(mintToSeed('mint-a')).toString('hex');
    const b = Buffer.from(mintToSeed('mint-b')).toString('hex');
    expect(a).not.toBe(b);
  });

  it('throws on empty mint', () => {
    expect(() => mintToSeed('')).toThrow();
    expect(() => mintToSeed('   ')).toThrow();
  });
});
