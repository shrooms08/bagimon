import { Panel } from '../ui/Panel';
import styles from './CoinFooter.module.css';
import { shortMint } from '../../lib/format';
import { CopyMintButton } from './CopyMintButton';
import type { PetdexBagimon } from '../../lib/types';

export function CoinFooter({ bagimon }: { bagimon: PetdexBagimon }) {
  const sym = bagimon.coinSymbol ? `$${bagimon.coinSymbol}` : '—';
  const bagsFmUrl = `https://bags.fm/${bagimon.coinMint}`;
  return (
    <section aria-label="Coin info">
      <h2 className="section-title">COIN INFO</h2>
      <Panel className={styles.card}>
        <div>
          <div className={styles.coinId}>
            <span className={styles.sym}>{sym}</span>
            {bagimon.coinName ? <span className={styles.full}>{bagimon.coinName}</span> : null}
          </div>
          <div className={styles.mintRow}>
            <span className={styles.mint}>{shortMint(bagimon.coinMint)}</span>
            <CopyMintButton mint={bagimon.coinMint} />
          </div>
          {!bagimon.isAlive ? (
            <div className={styles.mintRow}>
              <span className={styles.mint}>
                Bagimon lifespan: {bagimon.lifespanDays} day{bagimon.lifespanDays === 1 ? '' : 's'}
              </span>
            </div>
          ) : null}
        </div>
        <div className={styles.actions}>
          <a className={styles.extLink} href={bagsFmUrl} target="_blank" rel="noopener noreferrer">
            BAGS.FM <span aria-hidden="true">↗</span>
          </a>
        </div>
      </Panel>
    </section>
  );
}
