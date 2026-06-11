import { Panel } from '../ui/Panel';
import styles from './WhyBagimon.module.css';

export function WhyBagimon() {
  return (
    <section aria-label="Why Bagimon">
      <h2 className="section-title">WHY BAGIMON</h2>
      <Panel className={styles.panel}>
        <p className={styles.para}>
          Memecoins typically die within 48 hours of launch. Bagimon ties coin survival to
          community engagement — communities trade and engage to keep their pet alive. Each
          on-chain swap is a heartbeat.
        </p>
        <p className={styles.para}>
          Built natively on Bags.fm: every Bagimon tracks its coin&apos;s top 10 holders as
          &ldquo;parents,&rdquo; lives on a shareable Petdex page, and reflects real-time on-chain
          activity. Holders connect their wallet to care for it; creators can claim their own.
        </p>
        <p className={styles.para}>
          Death is permanent. Memorial pages live forever as records that the coin once mattered.
          Bagimon makes coins feel things — and that turns trading from speculation into care.
        </p>
      </Panel>
    </section>
  );
}
