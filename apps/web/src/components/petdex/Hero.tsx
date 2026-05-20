import type { CSSProperties } from 'react';
import { Panel } from '../ui/Panel';
import { MoodBadge } from '../ui/MoodBadge';
import { MemorialPlaque } from '../ui/MemorialPlaque';
import styles from './Hero.module.css';
import type { PetdexBagimon } from '../../lib/types';

interface HeroProps {
  bagimon: PetdexBagimon;
  imageSrc: string;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
          className={`${styles.spriteImage} ${!bagimon.isAlive ? 'memorial-greyscale' : ''}`}
          src={imageSrc}
          alt={`${bagimon.speciesDisplayName} sprite`}
          width={384}
          height={384}
        />
      </div>
      <div className={styles.meta}>
        <div className="eyebrow">PETDEX&nbsp;{bagimon.petdexNumber}</div>
        <h1
          className={styles.coinName}
          style={{ '--symbol-length': display.length } as CSSProperties}
        >
          {display}
        </h1>
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
        {bagimon.isAlive ? (
          <MoodBadge mood={bagimon.currentMood} />
        ) : (
          <MemorialPlaque />
        )}
        <p className={styles.tagline}>&ldquo;{bagimon.speciesLore}&rdquo;</p>
        {!bagimon.isAlive && bagimon.diedAt ? (
          <p className={styles.tagline}>
            <em>
              Died on {formatDate(bagimon.diedAt)}, lived for {bagimon.lifespanDays} day
              {bagimon.lifespanDays === 1 ? '' : 's'}.
            </em>
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
