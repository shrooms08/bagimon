// Tunable knobs for holder web interactions. Kept here (not baked into routes)
// so they're easy to adjust as we observe real usage.

// One action of each type per wallet per window.
export const COOLDOWN_MS = Number(process.env.INTERACTION_COOLDOWN_MINUTES ?? 60) * 60_000;

// Minimum UI token balance required to interact. Default 0 → any holder.
export const MIN_HOLD_AMOUNT = Number(process.env.MIN_HOLD_AMOUNT ?? 0);

// Static, species-agnostic reaction lines so a pet/feed costs zero AI tokens.
const FEED_LINES = [
  'munches happily and looks up at you.',
  'gobbles it down — tiny content wiggle.',
  'nom nom! feels a little stronger now.',
  'snuffles the treat and beams.',
];

const PET_LINES = [
  'leans into your hand, purring.',
  'does a happy little bounce!',
  'blinks slowly — it trusts you.',
  'wiggles with joy at the attention.',
];

export function reactionLine(action: 'feed' | 'pet'): string {
  const lines = action === 'feed' ? FEED_LINES : PET_LINES;
  return lines[Math.floor(Math.random() * lines.length)] ?? lines[0]!;
}
