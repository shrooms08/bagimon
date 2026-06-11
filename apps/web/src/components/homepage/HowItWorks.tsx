import { Panel } from '../ui/Panel';
import styles from './HowItWorks.module.css';

const STEPS = [
  {
    n: '01',
    title: 'Launch your coin on Bags',
    body: 'Every coin minted on Bags.fm can adopt a Bagimon — a unique hand-drawn pixel-art creature.',
  },
  {
    n: '02',
    title: 'Spawn its Bagimon',
    body: "Paste the coin's mint to bring its creature to life. Creators can claim their own. Got a Discord? You can add Bagimon there too.",
  },
  {
    n: '03',
    title: 'Trade to keep it alive',
    body: 'Mood is tied to on-chain activity. Volume drops, the pet gets hungry.',
    emphasis: '14 days of silence and it dies — permanently.',
  },
];

export function HowItWorks() {
  return (
    <section aria-label="How it works">
      <h2 className="section-title">HOW IT WORKS</h2>
      <Panel className={styles.panel}>
        <ol className={styles.list}>
          {STEPS.map((s) => (
            <li key={s.n} className={styles.step}>
              <span className={styles.num}>{s.n}</span>
              <div className={styles.body}>
                <h3 className={styles.title}>{s.title}</h3>
                <p className={styles.text}>
                  {s.body}
                  {s.emphasis ? (
                    <>
                      {' '}
                      <span className={styles.emphasis}>{s.emphasis}</span>
                    </>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </section>
  );
}
