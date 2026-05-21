import Link from 'next/link';
import { Panel } from '../ui/Panel';
import styles from './GetStarted.module.css';

const GITHUB_URL = 'https://github.com/shrooms08/bagimon';

export function GetStarted() {
  const invite = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL ?? '';
  return (
    <section aria-label="Get started">
      <h2 className="section-title">GET STARTED</h2>
      <Panel className={styles.panel}>
        <div className={styles.ctaRow}>
          {invite ? (
            <a className={styles.primary} href={invite} target="_blank" rel="noopener noreferrer">
              INSTALL ON DISCORD ▶
            </a>
          ) : (
            <Link className={styles.primary} href="/">
              INSTALL ON DISCORD ▶
            </Link>
          )}
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
          Free during the hackathon. No coin required — invite the bot and link any Bags coin to
          spawn a Bagimon.
        </p>
      </Panel>
    </section>
  );
}
