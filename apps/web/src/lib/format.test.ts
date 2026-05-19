import { describe, it, expect } from 'vitest';
import {
  bornAtLabel,
  formatPercent,
  formatUsd,
  petdexNumber,
  relativeTime,
  shortMint,
} from './format';

describe('format', () => {
  it('formatUsd handles ranges', () => {
    expect(formatUsd(null)).toBe('—');
    expect(formatUsd(undefined)).toBe('—');
    expect(formatUsd(0.001234)).toBe('$0.00123');
    expect(formatUsd(0.5)).toBe('$0.500');
    expect(formatUsd(12.34)).toBe('$12.34');
    expect(formatUsd(3482)).toBe('$3.5K');
    expect(formatUsd(1_500_000)).toBe('$1.50M');
    expect(formatUsd(2_300_000_000)).toBe('$2.30B');
  });

  it('formatPercent signs the number', () => {
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(12.345)).toBe('+12.3%');
    expect(formatPercent(-3.2)).toBe('-3.2%');
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('relativeTime buckets', () => {
    const now = new Date('2026-05-19T12:00:00Z');
    expect(relativeTime(new Date('2026-05-19T11:59:30Z'), now)).toBe('30s ago');
    expect(relativeTime(new Date('2026-05-19T11:00:00Z'), now)).toBe('1 hr ago');
    expect(relativeTime(new Date('2026-05-19T11:30:00Z'), now)).toBe('30 min ago');
    expect(relativeTime(new Date('2026-05-19T09:00:00Z'), now)).toBe('3 hr ago');
    expect(relativeTime(new Date('2026-05-17T12:00:00Z'), now)).toBe('2 d ago');
    expect(relativeTime(new Date('2026-05-19T12:00:30Z'), now)).toBe('just now');
  });

  it('shortMint truncates long addresses', () => {
    expect(shortMint('short')).toBe('short');
    expect(shortMint('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe('EPjFW…GkZwyTDt1v');
  });

  it('petdexNumber is deterministic and zero-padded', () => {
    expect(petdexNumber('00000000-aaaa-bbbb-cccc-ddddeeeeffff')).toBe('№ 0000');
    expect(petdexNumber('1a2b3c4d-aaaa-bbbb-cccc-ddddeeeeffff')).toMatch(/^№ \d{4}$/);
    // ffff = 65535, 65535 % 9999 = 5541
    expect(petdexNumber('ffffffff-aaaa-bbbb-cccc-ddddeeeeffff')).toBe('№ 5541');
  });

  it('bornAtLabel renders a short date', () => {
    expect(bornAtLabel(new Date('2026-05-02T00:00:00Z'))).toMatch(/^[A-Z][a-z]{2} \d+, 2026$/);
  });
});
