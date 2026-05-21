import { Panel } from '../ui/Panel';
import styles from './BagsPanels.module.css';
import type { PetdexBagimon } from '../../lib/types';

export function BagsPanels({ bagimon }: { bagimon: PetdexBagimon }) {
  const hasFees = bagimon.lifetimeFeesSol != null;
  const hasCreator = bagimon.creator != null;
  if (!hasFees && !hasCreator) return null;

  const memorial = !bagimon.isAlive;
  const feesLabel = memorial ? 'FINAL FEES' : 'LIFETIME FEES';
  const feesCaption = memorial ? 'earned before death' : 'earned via Bags trading';
  const creatorLabel = memorial ? 'CREATED BY' : 'CREATED BY';

  return (
    <>
      {hasFees ? (
        <section aria-label={feesLabel}>
          <h2 className="section-title">{feesLabel}</h2>
          <Panel>
            <div className={styles.feesBox}>
              <div className={styles.feesValue}>
                {(bagimon.lifetimeFeesSol ?? 0).toFixed(2)} SOL
              </div>
              <div className={styles.feesCaption}>{feesCaption}</div>
            </div>
          </Panel>
        </section>
      ) : null}
      {hasCreator && bagimon.creator ? (
        <section aria-label={creatorLabel}>
          <h2 className="section-title">{creatorLabel}</h2>
          <Panel>
            <div className={styles.creatorBox}>
              {bagimon.creator.pfp ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bagimon.creator.pfp}
                  alt=""
                  className={styles.creatorPfp}
                  width={64}
                  height={64}
                />
              ) : (
                <div className={styles.creatorPfpFallback} aria-hidden />
              )}
              <div className={styles.creatorMeta}>
                <div className={styles.creatorName}>
                  {bagimon.creator.providerUsername ??
                    bagimon.creator.username ??
                    shortWallet(bagimon.creator.wallet)}
                </div>
                {bagimon.creator.provider ? (
                  <div className={styles.creatorSub}>via {bagimon.creator.provider}</div>
                ) : null}
                {bagimon.creator.royaltyBps != null ? (
                  <div className={styles.creatorSub}>
                    {(bagimon.creator.royaltyBps / 100).toFixed(1)}% royalty
                  </div>
                ) : null}
              </div>
            </div>
          </Panel>
        </section>
      ) : null}
    </>
  );
}

function shortWallet(addr: string): string {
  if (addr.length <= 8) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}
