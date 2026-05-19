import { Panel } from '../ui/Panel';
import styles from './RecentInteractions.module.css';
import { relativeTime } from '../../lib/format';
import type { PetdexInteraction } from '../../lib/types';

interface Props {
  interactions: PetdexInteraction[];
  coinSymbol: string | null;
}

export function RecentInteractions({ interactions, coinSymbol }: Props) {
  const speaker = coinSymbol ? `$${coinSymbol}:` : 'BAGIMON:';
  return (
    <section aria-label="Recent interactions">
      <h2 className="section-title">RECENT INTERACTIONS</h2>
      {interactions.length === 0 ? (
        <Panel>
          <p className={styles.empty}>No one has pet this Bagimon yet.</p>
        </Panel>
      ) : (
        <div className={styles.dialogs}>
          {interactions.map((ix, idx) => (
            <Panel key={`${ix.createdAt.toISOString()}-${idx}`} className={styles.dialog}>
              <div className={styles.speaker}>{speaker}</div>
              <div className={`${styles.text} ${idx === 0 ? styles.firstText : ''}`}>
                &ldquo;{ix.responseText}&rdquo;
              </div>
              <div className={styles.time}>
                {relativeTime(ix.createdAt)} · pet by{' '}
                <span className={styles.handle}>{ix.petterDisplayName}</span>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </section>
  );
}
