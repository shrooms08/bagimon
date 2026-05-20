import styles from './MemorialPlaque.module.css';

export function MemorialPlaque() {
  return (
    <div className={styles.plaque} role="status" aria-label="In memoriam">
      <span className={styles.icon}>💀</span>
      <span>IN MEMORIAM</span>
    </div>
  );
}
