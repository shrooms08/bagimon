import { Panel } from '../ui/Panel';
import styles from './MoodLifecycle.module.css';

const MOODS = [
  { id: 'happy', name: 'HAPPY', desc: 'default state, content' },
  { id: 'thriving', name: 'THRIVING', desc: 'volume up, price up — golden hour' },
  { id: 'hungry', name: 'HUNGRY', desc: 'low volume, looking for attention' },
  { id: 'sick', name: 'SICK', desc: 'price dropped hard' },
  { id: 'dying', name: 'DYING', desc: 'the silence is getting heavy' },
] as const;

export function MoodLifecycle() {
  return (
    <section aria-label="Mood lifecycle">
      <h2 className="section-title">FIVE MOODS</h2>
      <div className={styles.row}>
        {MOODS.map((m) => (
          <Panel key={m.id} tight className={`${styles.card} ${styles[`mood_${m.id}`] ?? ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.sprite}
              src={`/mood-sprites/${m.id}.png`}
              alt={`${m.name} ghotosai sprite`}
              width={96}
              height={96}
              loading="lazy"
            />
            <div className={styles.name}>{m.name}</div>
            <div className={styles.desc}>{m.desc}</div>
            {m.id === 'dying' ? (
              <div className={styles.footnote}>
                <em>14 days in this state = permanent death.</em>
              </div>
            ) : null}
          </Panel>
        ))}
      </div>
    </section>
  );
}
