import { Panel } from '../ui/Panel';
import styles from './RecentInteractions.module.css';
import { relativeTime } from '../../lib/format';
import type { PetdexInteraction } from '../../lib/types';

interface Props {
  interactions: PetdexInteraction[];
  coinSymbol: string | null;
  memorialMode?: boolean;
}

export function RecentInteractions({ interactions, coinSymbol, memorialMode = false }: Props) {
  const speaker = coinSymbol ? `$${coinSymbol}:` : 'BAGIMON:';
  const symbol = coinSymbol ? `$${coinSymbol}` : 'This Bagimon';
  const heading = memorialMode ? 'MEMORIES' : 'RECENT INTERACTIONS';
  const emptyText = memorialMode
    ? `${symbol} departed before anyone said goodbye.`
    : 'No one has pet this Bagimon yet.';
  return (
    <section aria-label={memorialMode ? 'Memories' : 'Recent interactions'}>
      <h2 className="section-title">{heading}</h2>
      {memorialMode ? (
        <p className={styles.caption}>
          {symbol} can no longer be pet. These were the last visits.
        </p>
      ) : null}
      {interactions.length === 0 ? (
        <Panel>
          <p className={styles.empty}>{emptyText}</p>
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
