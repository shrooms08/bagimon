import { describe, expect, it } from 'vitest';
import { RateLimiter } from '../rate-limiter.js';

describe('RateLimiter', () => {
  it('allows up to maxCalls within the window', () => {
    const rl = new RateLimiter(3, 60_000);
    const t = 1_000_000;
    expect(rl.isAllowed('k', t)).toBe(true);
    rl.record('k', t);
    rl.record('k', t + 1);
    rl.record('k', t + 2);
    expect(rl.isAllowed('k', t + 3)).toBe(false);
  });

  it('prunes entries outside the window', () => {
    const rl = new RateLimiter(2, 1_000);
    rl.record('k', 0);
    rl.record('k', 500);
    expect(rl.isAllowed('k', 1_500)).toBe(true);
  });

  it('isolates keys', () => {
    const rl = new RateLimiter(1, 60_000);
    rl.record('a', 0);
    expect(rl.isAllowed('a', 1)).toBe(false);
    expect(rl.isAllowed('b', 1)).toBe(true);
  });

  it('does not record if isAllowed returns false (caller responsibility)', () => {
    // Just verifies record() is purely additive and prune-based.
    const rl = new RateLimiter(1, 60_000);
    rl.record('k', 0);
    expect(rl.isAllowed('k', 1)).toBe(false);
    rl.record('k', 1);
    expect(rl.isAllowed('k', 2)).toBe(false);
  });
});
