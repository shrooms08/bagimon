import type { Mood } from './types.js';

export interface MoodTransitionPoint {
  mood: Mood;
  createdAt: Date;
}

const DAY_MS = 86_400_000;

// Given a Bagimon's mood transition history sorted DESC by createdAt (newest
// first), return how long the current continuous `dying` streak has lasted in
// days. If the most-recent mood is not `dying`, returns 0.
//
// The streak starts at the FIRST `dying` transition after the most-recent
// non-dying transition. If every transition in the window is `dying`, we
// anchor to the oldest `dying` row we see (in practice the spawn `happy` row
// will be present and break the streak first).
//
// bornAt is accepted for future use / edge cases — currently we trust the
// transition rows. An empty transition list returns 0 because real Bagimons
// always have at least one `happy` spawn row.
export function continuousDyingDays(
  transitions: readonly MoodTransitionPoint[],
  _bornAt: Date,
  now: Date = new Date(),
): number {
  if (transitions.length === 0) return 0;
  const latest = transitions[0]!;
  if (latest.mood !== 'dying') return 0;

  let streakStart = latest.createdAt;
  for (let i = 1; i < transitions.length; i += 1) {
    const t = transitions[i]!;
    if (t.mood === 'dying') {
      streakStart = t.createdAt;
      continue;
    }
    break;
  }
  const ms = now.getTime() - streakStart.getTime();
  return Math.max(0, ms / DAY_MS);
}
