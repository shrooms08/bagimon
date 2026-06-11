import type { Metadata } from 'next';
import Link from 'next/link';
import { SpawnBox } from '../../components/spawn/SpawnBox';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Spawn a Bagimon',
  description: 'Paste a Bags coin mint address to bring its Bagimon to life.',
};

export default function SpawnPage() {
  return (
    <main className="page" data-mood="happy">
      <section className={styles.section}>
        <div className={styles.inner}>
          <Link className={styles.back} href="/">
            ← Bagimon
          </Link>
          <h1 className={styles.heading}>Spawn a Bagimon</h1>
          <p className={styles.lede}>
            Every coin launched on bags.fm can have a Bagimon — a creature whose mood lives and
            dies by the coin&rsquo;s on-chain activity. Paste a mint to bring its Bagimon to life.
          </p>
          <SpawnBox />
          <p className={styles.note}>
            Already has one? You&rsquo;ll land on its Petdex. Not a Bags coin? It won&rsquo;t spawn.
          </p>
        </div>
      </section>
    </main>
  );
}
