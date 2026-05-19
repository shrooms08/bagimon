import Link from 'next/link';
import { Panel } from '../components/ui/Panel';
import { PoweredBy } from '../components/petdex/PoweredBy';
import styles from './page.module.css';

export default function HomePage() {
  const invite = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL ?? '';
  return (
    <main className={`${styles.main} page`}>
      <Panel className={styles.card}>
        <div className={styles.logo} aria-hidden="true">
          <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor">
              <rect x="5" y="0" width="1" height="1" />
              <rect x="6" y="1" width="1" height="1" />
              <rect x="5" y="2" width="1" height="1" />
              <rect x="3" y="3" width="6" height="1" />
              <rect x="2" y="4" width="8" height="1" />
              <rect x="1" y="5" width="10" height="1" />
              <rect x="1" y="6" width="10" height="1" />
              <rect x="1" y="7" width="10" height="1" />
              <rect x="2" y="8" width="8" height="1" />
              <rect x="3" y="9" width="2" height="1" />
              <rect x="7" y="9" width="2" height="1" />
            </g>
            <g fill="#fff7e2">
              <rect x="3" y="5" width="2" height="2" />
              <rect x="7" y="5" width="2" height="2" />
            </g>
            <g fill="#2c2418">
              <rect x="4" y="6" width="1" height="1" />
              <rect x="8" y="6" width="1" height="1" />
            </g>
          </svg>
        </div>
        <h1 className={styles.brand}>BAGIMON</h1>
        <p className={styles.tagline}>A digital spirit for every coin on Bags.fm.</p>
        <p className={styles.description}>
          Each coin on Bags.fm can adopt a Bagimon — a hand-drawn pixel-art creature that lives in
          your Discord server and reacts to your community in real time.
        </p>
        {invite ? (
          <a className={styles.cta} href={invite} target="_blank" rel="noopener noreferrer">
            INSTALL ON DISCORD ▶
          </a>
        ) : (
          <Link className={styles.cta} href="/">
            INSTALL ON DISCORD ▶
          </Link>
        )}
      </Panel>
      <PoweredBy />
    </main>
  );
}
