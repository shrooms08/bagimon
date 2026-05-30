import { Panel } from '../ui/Panel';
import styles from './RecentInteractions.module.css';
import { relativeTime } from '../../lib/format';
import type { PetdexInteraction } from '../../lib/types';

interface Props {
  interactions: PetdexInteraction[];
  coinSymbol: string | null;
  timesFed: number;
  timesPet: number;
  memorialMode?: boolean;
}

function truncate(addr: string): string {
  return addr.length > 9 ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : addr;
}

export function RecentInteractions({
  interactions,
  coinSymbol,
  timesFed,
  timesPet,
  memorialMode = false,
}: Props) {
  const speaker = coinSymbol ? `$${coinSymbol}:` : 'BAGIMON:';
  const symbol = coinSymbol ? `$${coinSymbol}` : 'this Bagimon';
  const heading = memorialMode ? 'MEMORIES' : 'RECENT INTERACTIONS';
  const emptyText = memorialMode
    ? `${coinSymbol ? `$${coinSymbol}` : 'This Bagimon'} departed before anyone said goodbye.`
    : 'No one has cared for this Bagimon yet.';
  return (
    <section aria-label={memorialMode ? 'Memories' : 'Recent interactions'}>
      <h2 className="section-title">{heading}</h2>
      {memorialMode ? (
        <p className={styles.caption}>
          {coinSymbol ? `$${coinSymbol}` : 'This Bagimon'} can no longer be cared for. These were
          the last visits.
        </p>
      ) : (
        <p className={styles.counters}>
          Fed <strong>{timesFed}</strong> times · Pet <strong>{timesPet}</strong> times
        </p>
      )}
      {interactions.length === 0 ? (
        <Panel>
          <p className={styles.empty}>{emptyText}</p>
        </Panel>
      ) : (
        <div className={styles.dialogs}>
          {interactions.map((ix, idx) => {
            const verb = ix.action === 'feed' ? 'fed' : 'pet';
            return (
              <Panel key={`${ix.createdAt.toISOString()}-${idx}`} className={styles.dialog}>
                <div className={styles.speaker}>{speaker}</div>
                <div className={`${styles.text} ${idx === 0 ? styles.firstText : ''}`}>
                  &ldquo;{ix.responseText}&rdquo;
                </div>
                <div className={styles.time}>
                  {relativeTime(ix.createdAt)} ·{' '}
                  {ix.channel === 'web' && ix.actorWallet ? (
                    <span className={styles.web}>
                      <span className={styles.wallet}>{truncate(ix.actorWallet)}</span> {verb}{' '}
                      {symbol}
                    </span>
                  ) : (
                    <span>
                      {verb} by{' '}
                      <span className={styles.handle}>{ix.petterDisplayName ?? 'someone'}</span>
                    </span>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </section>
  );
}
