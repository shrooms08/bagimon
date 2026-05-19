import styles from './PoweredBy.module.css';

export function PoweredBy() {
  return (
    <div className={styles.powered}>
      <span className={styles.logo} aria-hidden="true">
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
      </span>
      POWERED BY BAGIMON
    </div>
  );
}
