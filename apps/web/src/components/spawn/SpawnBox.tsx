'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './SpawnBox.module.css';

interface SpawnResponse {
  ok: boolean;
  id?: string;
  existed?: boolean;
  reason?: string;
  message?: string;
}

export function SpawnBox() {
  const router = useRouter();
  const [mint, setMint] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const value = mint.trim();
      if (!value || busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch('/api/bagimon/spawn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coinMint: value }),
        });
        const data = (await res.json()) as SpawnResponse;
        if (!res.ok || !data.ok || !data.id) {
          setError(data.message ?? 'Could not spawn a Bagimon. Try again.');
          setBusy(false);
          return;
        }
        // Redirect to the Petdex (newly spawned or pre-existing).
        router.push(`/p/${data.id}`);
      } catch {
        setError('Something went wrong. Try again.');
        setBusy(false);
      }
    },
    [mint, busy, router],
  );

  return (
    <form className={styles.box} onSubmit={submit}>
      <label className={styles.label} htmlFor="spawn-mint">
        Paste a Bags coin mint address
      </label>
      <div className={styles.row}>
        <input
          id="spawn-mint"
          className={styles.input}
          value={mint}
          onChange={(e) => setMint(e.target.value)}
          placeholder="Bags coin mint address…"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          disabled={busy}
        />
        <button className={styles.button} type="submit" disabled={busy || !mint.trim()}>
          {busy ? 'Spawning…' : 'Spawn Bagimon'}
        </button>
      </div>
      {error && (
        <p className={styles.error}>
          {error}{' '}
          <a className={styles.link} href="https://bags.fm" target="_blank" rel="noreferrer">
            Find a coin on bags.fm →
          </a>
        </p>
      )}
    </form>
  );
}
