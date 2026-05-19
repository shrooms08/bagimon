import Link from 'next/link';
import { Panel } from '../../../components/ui/Panel';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.shell} data-mood="dying">
      <main className={`${styles.main} page`}>
        <Panel className={styles.card}>
          <div className={styles.code}>404</div>
          <div className={styles.headline}>No Bagimon found at this address.</div>
          <div className={styles.mascot} aria-hidden="true">
            <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
              <g fill="currentColor">
                <rect x="3" y="3" width="6" height="1" />
                <rect x="2" y="4" width="8" height="1" />
                <rect x="1" y="5" width="10" height="1" />
                <rect x="1" y="6" width="10" height="1" />
                <rect x="1" y="7" width="10" height="1" />
                <rect x="2" y="8" width="8" height="1" />
                <rect x="3" y="9" width="2" height="1" />
                <rect x="7" y="9" width="2" height="1" />
              </g>
              <g fill="#2c2418">
                <rect x="3" y="5" width="2" height="1" />
                <rect x="7" y="5" width="2" height="1" />
              </g>
            </svg>
          </div>
          <Link className={styles.back} href="/">
            ◀ BACK HOME
          </Link>
        </Panel>
      </main>
    </div>
  );
}
