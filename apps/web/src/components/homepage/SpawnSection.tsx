import { SpawnBox } from '../spawn/SpawnBox';
import styles from './SpawnSection.module.css';

export function SpawnSection() {
  return (
    <section className={styles.section} id="spawn">
      <div className={styles.inner}>
        <h2 className={styles.heading}>Spawn one now</h2>
        <p className={styles.body}>
          Got a Bags coin? Paste its mint and meet its Bagimon. No Discord required.
        </p>
        <SpawnBox />
      </div>
    </section>
  );
}
