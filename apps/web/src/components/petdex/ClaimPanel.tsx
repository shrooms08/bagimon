'use client';

import { useCallback, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import bs58 from 'bs58';
import styles from './ClaimPanel.module.css';

type Phase = 'idle' | 'signing' | 'claiming' | 'error';

interface Props {
  bagimonId: string;
  coinSymbol: string | null;
  ownerWallet: string | null;
  creatorWallet: string | null;
  creatorLabel: string | null;
}

interface NonceResponse {
  nonceToken: string;
  message: string;
}

interface ClaimResponse {
  ok: boolean;
  claimed?: boolean;
  owner?: string;
  reason?: string;
  message?: string;
}

function shortWallet(w: string): string {
  return `${w.slice(0, 4)}…${w.slice(-4)}`;
}

export function ClaimPanel({ bagimonId, coinSymbol, ownerWallet, creatorWallet, creatorLabel }: Props) {
  const { publicKey, signMessage, connected } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(ownerWallet);

  const ownerLabel = useMemo(() => {
    if (!owner) return null;
    if (creatorWallet && owner === creatorWallet && creatorLabel) return creatorLabel;
    return shortWallet(owner);
  }, [owner, creatorWallet, creatorLabel]);

  const viewerIsCreator = Boolean(wallet && creatorWallet && wallet === creatorWallet);

  const claim = useCallback(async () => {
    if (!wallet || !signMessage) {
      setError('Connect a wallet that can sign messages.');
      setPhase('error');
      return;
    }
    setPhase('signing');
    setError(null);
    try {
      const nonceRes = await fetch(`/api/bagimon/${bagimonId}/claim-nonce`);
      if (!nonceRes.ok) throw new Error('could not start the claim');
      const { nonceToken, message } = (await nonceRes.json()) as NonceResponse;
      const signature = bs58.encode(await signMessage(new TextEncoder().encode(message)));

      setPhase('claiming');
      const res = await fetch(`/api/bagimon/${bagimonId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, signature, message, nonceToken }),
      });
      const data = (await res.json()) as ClaimResponse;
      if (data.ok && data.claimed) {
        setOwner(data.owner ?? wallet);
        setPhase('idle');
        return;
      }
      setError(data.message ?? data.reason ?? 'Could not claim this Bagimon.');
      setPhase('error');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not claim this Bagimon.');
      setPhase('error');
    }
  }, [wallet, signMessage, bagimonId]);

  // --- Claimed ---
  if (owner) {
    const yours = Boolean(wallet && wallet === owner);
    return (
      <section className={`${styles.panel} ${styles.claimed}`}>
        <span className={styles.crown} aria-hidden>
          👑
        </span>
        <div>
          <p className={styles.claimedTitle}>Claimed by its creator</p>
          <p className={styles.claimedBody}>
            Owned by <span className={styles.owner}>{ownerLabel}</span>
            {yours ? ' — that’s you.' : '.'}
          </p>
        </div>
      </section>
    );
  }

  // --- Unclaimed, viewer is the creator → prominent claim ---
  if (viewerIsCreator) {
    const busy = phase === 'signing' || phase === 'claiming';
    return (
      <section className={`${styles.panel} ${styles.creator}`}>
        <p className={styles.title}>You created {coinSymbol ? `$${coinSymbol}` : 'this coin'}.</p>
        <p className={styles.body}>
          Claim its Bagimon to mark it as yours. A free signature proves you&rsquo;re the creator —
          no transaction, no funds, no on-chain write.
        </p>
        <button className={styles.button} onClick={claim} disabled={busy}>
          {phase === 'signing'
            ? 'Sign in your wallet…'
            : phase === 'claiming'
              ? 'Claiming…'
              : 'Claim your Bagimon'}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </section>
    );
  }

  // --- Unclaimed, viewer not (yet) the creator ---
  return (
    <section className={`${styles.panel} ${styles.unclaimed}`}>
      <div>
        <p className={styles.title}>Unclaimed</p>
        <p className={styles.body}>
          {connected
            ? 'No creator has claimed this Bagimon yet.'
            : 'The coin’s creator can claim this Bagimon.'}
        </p>
      </div>
      {!connected && (
        <div className={styles.connect}>
          <WalletMultiButton />
        </div>
      )}
    </section>
  );
}
