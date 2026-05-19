import { Panel } from '../ui/Panel';
import styles from './LiveStats.module.css';
import { bornAtLabel, formatPercent, formatUsd, relativeTime } from '../../lib/format';
import type { PetdexBagimon } from '../../lib/types';

export function LiveStats({ bagimon }: { bagimon: PetdexBagimon }) {
  const change = bagimon.priceChange24hPct;
  const direction = change == null ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  // A brand-new Bagimon may have a current price snapshot but no 24h
  // comparison window yet. Surface that explicitly instead of "—".
  const isNewListing = change == null && bagimon.priceUsd != null;
  return (
    <section aria-label="Live stats">
      <h2 className="section-title">LIVE STATS</h2>
      <Panel>
        <div className={styles.grid}>
          <div className={styles.tile}>
            <div className={styles.label}>24h PRICE</div>
            <div
              className={[
                styles.value,
                direction === 'up' ? styles.up : '',
                direction === 'down' ? styles.down : '',
                isNewListing ? styles.newListing : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {direction === 'up' ? <span className={styles.arrowUp} /> : null}
              {direction === 'down' ? <span className={styles.arrowDown} /> : null}
              {isNewListing ? 'new' : formatPercent(change)}
            </div>
            <div className={styles.sub}>{formatUsd(bagimon.priceUsd)} USD</div>
          </div>
          <div className={styles.tile}>
            <div className={styles.label}>24h VOLUME</div>
            <div className={styles.value}>{formatUsd(bagimon.volume24hUsd)}</div>
            <div className={styles.sub}>last 24h</div>
          </div>
          <div className={styles.tile}>
            <div className={styles.label}>AGE</div>
            <div className={styles.value}>{bagimon.ageDays}d</div>
            <div className={styles.sub}>Born {bornAtLabel(bagimon.bornAt)}</div>
          </div>
          <div className={styles.tile}>
            <div className={styles.label}>LAST UPDATED</div>
            <div className={`${styles.value} ${styles.valueSmall}`}>
              {bagimon.lastStatsAt ? relativeTime(bagimon.lastStatsAt) : 'never'}
            </div>
            <div className={styles.sub}>refreshes every 30 min</div>
          </div>
        </div>
      </Panel>
    </section>
  );
}
