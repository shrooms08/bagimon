import { Panel } from '../ui/Panel';
import { SpawnBox } from '../spawn/SpawnBox';
import styles from './SpawnSection.module.css';

export function SpawnSection() {
  return (
    <section aria-label="Spawn a Bagimon" id="spawn">
      <h2 className="section-title">SPAWN ONE NOW</h2>
      <Panel className={styles.panel}>
        <p className={styles.body}>
          Got a Bags coin? Paste its mint and meet its Bagimon. No install required.
        </p>
        <SpawnBox />
      </Panel>
    </section>
  );
}
