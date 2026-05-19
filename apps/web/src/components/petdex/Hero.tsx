import { Panel } from '../ui/Panel';
import { MoodBadge } from '../ui/MoodBadge';
import styles from './Hero.module.css';
import type { PetdexBagimon } from '../../lib/types';

interface HeroProps {
  bagimon: PetdexBagimon;
  imageSrc: string;
}

export function Hero({ bagimon, imageSrc }: HeroProps) {
  const display = bagimon.coinSymbol ? `$${bagimon.coinSymbol}` : 'BAGIMON';
  const [typeA, typeB] = bagimon.speciesType.split('/');
  return (
    <Panel as="section" className={styles.hero} aria-label="Bagimon hero">
      <div className={styles.spriteBox}>
        <div className={styles.corners} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.spriteImage}
          src={imageSrc}
          alt={`${bagimon.speciesDisplayName} sprite`}
          width={384}
          height={384}
        />
      </div>
      <div className={styles.meta}>
        <div className="eyebrow">PETDEX&nbsp;{bagimon.petdexNumber}</div>
        <h1 className={styles.coinName}>{display}</h1>
        <div className={styles.speciesBlock}>
          <div className={styles.sr}>
            <span className={styles.key}>SPECIES</span>
            <span className={styles.val}>{bagimon.speciesDisplayName}</span>
          </div>
          <div className={styles.sr}>
            <span className={styles.key}>TYPE</span>
            <span className={styles.val}>
              {typeA}
              {typeB ? (
                <>
                  <span className={styles.sep}>/</span>
                  {typeB}
                </>
              ) : null}
            </span>
          </div>
        </div>
        <MoodBadge mood={bagimon.currentMood} />
        <p className={styles.tagline}>&ldquo;{bagimon.speciesLore}&rdquo;</p>
      </div>
    </Panel>
  );
}
