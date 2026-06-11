import Link from 'next/link';
import { Panel } from '../ui/Panel';
import styles from './GetStarted.module.css';

const GITHUB_URL = 'https://github.com/shrooms08/bagimon';

export function GetStarted() {
  return (
    <section aria-label="Get started">
      <h2 className="section-title">GET STARTED</h2>
      <Panel className={styles.panel}>
        <div className={styles.ctaRow}>
          <Link className={styles.primary} href="/spawn">
            SPAWN A BAGIMON ▶
          </Link>
          <a
            className={styles.secondary}
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            VIEW ON GITHUB
          </a>
        </div>
        <p className={styles.note}>
          Free during the hackathon. Paste any Bags coin to spawn its Bagimon — no install required.
        </p>
      </Panel>
    </section>
  );
}
