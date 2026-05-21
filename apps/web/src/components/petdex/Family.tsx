import { Panel } from '../ui/Panel';
import styles from './Family.module.css';
import type { PetdexParent } from '../../lib/types';

interface Props {
  parents: PetdexParent[];
  coinSymbol: string | null;
  memorialMode?: boolean;
}

function shortWallet(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function formatAmount(amt: number): string {
  if (!Number.isFinite(amt)) return '—';
  const abs = Math.abs(amt);
  if (abs >= 1_000_000_000) return `${(amt / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(amt / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(amt / 1_000).toFixed(1)}K`;
  if (abs >= 1) return amt.toFixed(2);
  return amt.toPrecision(3);
}

export function Family({ parents, coinSymbol, memorialMode = false }: Props) {
  const heading = memorialMode ? 'FINAL FAMILY' : 'FAMILY';
  const caption = memorialMode
    ? `The ${parents.length} soul${parents.length === 1 ? '' : 's'} who held until the end.`
    : null;
  const symbolLabel = coinSymbol ? `$${coinSymbol}` : 'tokens';

  if (parents.length === 0) {
    return (
      <section aria-label="Family">
        <h2 className="section-title">{heading}</h2>
        <Panel>
          <p className={styles.empty}>No family snapshot yet. Check back soon.</p>
        </Panel>
      </section>
    );
  }

  return (
    <section aria-label="Family">
      <h2 className="section-title">{heading}</h2>
      {caption ? <p className={styles.caption}>{caption}</p> : null}
      <Panel className={styles.card}>
        <ol className={styles.list}>
          {parents.map((p) => (
            <li
              key={`${p.rank}-${p.walletAddress}`}
              className={`${styles.row} ${p.rank === 1 ? styles.crown : ''}`}
            >
              <span className={styles.rank} aria-label={`Rank ${p.rank}`}>
                {String(p.rank).padStart(2, '0')}
              </span>
              <span className={styles.wallet}>{shortWallet(p.walletAddress)}</span>
              <span className={styles.amount}>
                {formatAmount(p.holdingAmount)} {symbolLabel}
              </span>
              <span className={styles.pct}>
                {p.holdingPercentOfSupply != null
                  ? `${p.holdingPercentOfSupply.toFixed(2)}%`
                  : '—'}
              </span>
            </li>
          ))}
        </ol>
      </Panel>
    </section>
  );
}
