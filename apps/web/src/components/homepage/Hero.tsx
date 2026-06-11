import Link from 'next/link';
import { Panel } from '../ui/Panel';
import styles from './Hero.module.css';

const GITHUB_URL = 'https://github.com/shrooms08/bagimon';

export function Hero() {
  return (
    <Panel as="section" className={styles.hero}>
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
      <p className={styles.subTagline}>
        <em>Built for the Bags Hackathon Q1 2026.</em>
      </p>
      <div className={styles.ctaRow}>
        <Link className={styles.cta} href="/spawn">
          SPAWN A BAGIMON ▶
        </Link>
        <a
          className={styles.ghLink}
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          view on GitHub →
        </a>
      </div>
    </Panel>
  );
}
