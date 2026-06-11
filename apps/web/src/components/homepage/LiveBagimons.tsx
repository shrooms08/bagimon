import Link from 'next/link';
import { Panel } from '../ui/Panel';
import type { HomepageBagimon } from '../../lib/fetch-homepage';
import styles from './LiveBagimons.module.css';

interface Props {
  bagimons: HomepageBagimon[];
}

export function LiveBagimons({ bagimons }: Props) {
  if (bagimons.length === 0) return null;
  return (
    <section aria-label="Live Bagimons">
      <h2 className="section-title">LIVE NOW</h2>
      <div className={styles.grid}>
        {bagimons.map((b) => (
          <Panel key={b.id} tight className={styles.card}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.sprite}
              src={`/api/bagimon/${b.id}/image`}
              alt={`${b.speciesDisplayName} sprite`}
              width={128}
              height={128}
              loading="lazy"
            />
            <div className={styles.symbol}>
              {b.coinSymbol ? `$${b.coinSymbol}` : 'BAGIMON'}
              {b.claimed ? (
                <span className={styles.claimed} title="Claimed by its creator" aria-label="Claimed by its creator">
                  {' '}👑
                </span>
              ) : null}
            </div>
            <div className={`${styles.moodChip} ${styles[`mood_${b.currentMood}`] ?? ''}`}>
              {b.currentMood.toUpperCase()}
            </div>
            <Link href={`/p/${b.id}`} className={styles.link}>
              View Petdex →
            </Link>
          </Panel>
        ))}
      </div>
    </section>
  );
}
