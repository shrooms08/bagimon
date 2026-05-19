import styles from './PaperNoise.module.css';

export function PaperNoise() {
  return (
    <svg
      className={styles.noise}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <filter id="paperNoise">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 0.17  0 0 0 0 0.14  0 0 0 0 0.08  0 0 0 0.08 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#paperNoise)" />
    </svg>
  );
}
