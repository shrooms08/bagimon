'use client';
import { useState } from 'react';
import styles from './CoinFooter.module.css';

export function CopyMintButton({ mint }: { mint: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(mint);
    } catch {
      // Clipboard API may be unavailable (e.g. http origin) — silently swallow.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <>
      <button type="button" className={styles.miniBtn} onClick={onClick}>
        COPY
      </button>
      <span className={`${styles.copied} ${copied ? styles.show : ''}`}>COPIED!</span>
    </>
  );
}
