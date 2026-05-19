import type { Mood } from '@bagimon/shared';
import styles from './MoodBadge.module.css';

const MOOD_EMOJI: Record<Mood, string> = {
  happy: '😊',
  thriving: '🌟',
  hungry: '🍂',
  sick: '🤒',
  dying: '🥀',
};

export function MoodBadge({ mood }: { mood: Mood }) {
  return (
    <div className={styles.badge}>
      <span className={styles.emoji}>{MOOD_EMOJI[mood]}</span>
      <span>{mood.toUpperCase()}</span>
    </div>
  );
}
