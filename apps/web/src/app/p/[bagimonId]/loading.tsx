import { Panel } from '../../../components/ui/Panel';
import styles from './loading.module.css';

export default function Loading() {
  return (
    <div className={styles.shell} data-mood="happy">
      <main className="page">
        <Panel className={styles.pulse}>
          <div className={styles.pulseInner} />
        </Panel>
        <Panel className={styles.pulse}>
          <div className={styles.pulseShort} />
        </Panel>
        <Panel className={styles.pulse}>
          <div className={styles.pulseShort} />
        </Panel>
      </main>
    </div>
  );
}
