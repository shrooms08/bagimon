export type Mood = 'happy' | 'hungry' | 'sick' | 'thriving' | 'dying';

export const MOODS: readonly Mood[] = ['happy', 'hungry', 'sick', 'thriving', 'dying'] as const;

export function moodAssetId(mood: Mood): string {
  return `mood_${mood}`;
}
