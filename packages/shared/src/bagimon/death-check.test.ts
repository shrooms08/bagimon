import { describe, expect, it } from 'vitest';
import { continuousDyingDays, type MoodTransitionPoint } from './death-check.js';

function daysAgo(days: number, now: Date): Date {
  return new Date(now.getTime() - days * 86_400_000);
}

const NOW = new Date('2026-05-20T12:00:00Z');

describe('continuousDyingDays', () => {
  it('returns 0 for empty transitions', () => {
    expect(continuousDyingDays([], daysAgo(30, NOW), NOW)).toBe(0);
  });

  it('returns 0 when latest mood is not dying', () => {
    const ts: MoodTransitionPoint[] = [
      { mood: 'happy', createdAt: daysAgo(1, NOW) },
      { mood: 'dying', createdAt: daysAgo(10, NOW) },
    ];
    expect(continuousDyingDays(ts, daysAgo(30, NOW), NOW)).toBe(0);
  });

  it('measures from the latest dying when previous transition is non-dying', () => {
    const ts: MoodTransitionPoint[] = [
      { mood: 'dying', createdAt: daysAgo(5, NOW) },
      { mood: 'happy', createdAt: daysAgo(7, NOW) },
    ];
    expect(continuousDyingDays(ts, daysAgo(30, NOW), NOW)).toBeCloseTo(5, 5);
  });

  it('measures from oldest dying when all transitions are dying', () => {
    const ts: MoodTransitionPoint[] = [
      { mood: 'dying', createdAt: daysAgo(2, NOW) },
      { mood: 'dying', createdAt: daysAgo(6, NOW) },
      { mood: 'dying', createdAt: daysAgo(10, NOW) },
    ];
    expect(continuousDyingDays(ts, daysAgo(30, NOW), NOW)).toBeCloseTo(10, 5);
  });

  it('handles fractional days (2 hours)', () => {
    const twoHours = new Date(NOW.getTime() - 2 * 60 * 60 * 1000);
    const ts: MoodTransitionPoint[] = [
      { mood: 'dying', createdAt: twoHours },
      { mood: 'happy', createdAt: daysAgo(1, NOW) },
    ];
    expect(continuousDyingDays(ts, daysAgo(30, NOW), NOW)).toBeCloseTo(2 / 24, 4);
  });

  it('counts streak from first dying after the most-recent non-dying', () => {
    const ts: MoodTransitionPoint[] = [
      { mood: 'dying', createdAt: daysAgo(3, NOW) },
      { mood: 'dying', createdAt: daysAgo(8, NOW) },
      { mood: 'happy', createdAt: daysAgo(12, NOW) },
      { mood: 'dying', createdAt: daysAgo(20, NOW) },
    ];
    expect(continuousDyingDays(ts, daysAgo(30, NOW), NOW)).toBeCloseTo(8, 5);
  });

  it('handles a single dying transition', () => {
    const ts: MoodTransitionPoint[] = [{ mood: 'dying', createdAt: daysAgo(14, NOW) }];
    expect(continuousDyingDays(ts, daysAgo(30, NOW), NOW)).toBeCloseTo(14, 5);
  });
});
