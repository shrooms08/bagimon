'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import bs58 from 'bs58';
import { Panel } from '../ui/Panel';
import styles from './InteractPanel.module.css';

interface Props {
  bagimonId: string;
  coinSymbol: string | null;
  coinMint: string;
  isAlive: boolean;
  timesFed: number;
  timesPet: number;
  lastFedBy: string | null;
}

type Action = 'feed' | 'pet';

function truncate(addr: string): string {
  return addr.length > 9 ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : addr;
}

export function InteractPanel(props: Props) {
  const { publicKey, signMessage, connected } = useWallet();
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState<Action | 'verify' | null>(null);
  const [notHolder, setNotHolder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);
  const [bounce, setBounce] = useState(false);
  const [timesFed, setTimesFed] = useState(props.timesFed);
  const [timesPet, setTimesPet] = useState(props.timesPet);
  const [lastFedBy, setLastFedBy] = useState(props.lastFedBy);
  const [cooldowns, setCooldowns] = useState<{ feed: number; pet: number }>({ feed: 0, pet: 0 });
  const [now, setNow] = useState(() => Date.now());

  const symbol = props.coinSymbol ? `$${props.coinSymbol}` : 'this coin';

  // Reset verification whenever the connected wallet changes.
  useEffect(() => {
    setVerified(false);
    setNotHolder(false);
    setError(null);
  }, [publicKey]);

  // Tick once a second while a cooldown is pending so the countdown updates.
  const cooldownActive = cooldowns.feed > now || cooldowns.pet > now;
  useEffect(() => {
    if (!cooldownActive) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownActive]);

  const remaining = useCallback(
    (action: Action) => Math.max(0, cooldowns[action] - now),
    [cooldowns, now],
  );

  const verify = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError('This wallet cannot sign messages.');
      return;
    }
    setBusy('verify');
    setError(null);
    setNotHolder(false);
    try {
      const nonceRes = await fetch(`/api/bagimon/${props.bagimonId}/nonce`);
      if (!nonceRes.ok) throw new Error('could not start verification');
      const { nonceToken, message } = (await nonceRes.json()) as {
        nonceToken: string;
        message: string;
      };
      const sigBytes = await signMessage(new TextEncoder().encode(message));
      const signature = bs58.encode(sigBytes);
      const res = await fetch(`/api/bagimon/${props.bagimonId}/verify-holder`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toBase58(), signature, message, nonceToken }),
      });
      const data = (await res.json()) as {
        verified: boolean;
        reason?: string;
        message?: string;
      };
      if (data.verified) {
        setVerified(true);
      } else if (data.reason === 'not_holder') {
        setNotHolder(true);
      } else {
        setError(data.message ?? data.reason ?? 'verification failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'verification failed');
    } finally {
      setBusy(null);
    }
  }, [publicKey, signMessage, props.bagimonId]);

  const act = useCallback(
    async (action: Action) => {
      setBusy(action);
      setError(null);
      try {
        const res = await fetch(`/api/bagimon/${props.bagimonId}/interact`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          reason?: string;
          response?: string;
          message?: string;
          nextAvailableAt?: string;
          newState?: { timesFed: number; timesPet: number; lastFedBy: string | null; nextAvailableAt: string };
        };
        if (data.ok && data.newState) {
          setTimesFed(data.newState.timesFed);
          setTimesPet(data.newState.timesPet);
          setLastFedBy(data.newState.lastFedBy);
          setReaction(data.response ?? null);
          setBounce(true);
          setTimeout(() => setBounce(false), 600);
          setCooldowns((c) => ({ ...c, [action]: Date.parse(data.newState!.nextAvailableAt) }));
        } else if (data.reason === 'cooldown' && data.nextAvailableAt) {
          setCooldowns((c) => ({ ...c, [action]: Date.parse(data.nextAvailableAt!) }));
        } else if (data.reason === 'not_verified') {
          setVerified(false);
          setError('Session expired — verify again.');
        } else if (data.reason === 'dead') {
          setError(data.message ?? 'This Bagimon has passed.');
        } else {
          setError(data.reason ?? 'something went wrong');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'something went wrong');
      } finally {
        setBusy(null);
      }
    },
    [props.bagimonId],
  );

  const counters = useMemo(
    () => (
      <div className={styles.counters}>
        <span>
          Fed <strong>{timesFed}</strong>
        </span>
        <span aria-hidden>·</span>
        <span>
          Pet <strong>{timesPet}</strong>
        </span>
        {lastFedBy ? (
          <span className={styles.lastFed}>last fed by {truncate(lastFedBy)}</span>
        ) : null}
      </div>
    ),
    [timesFed, timesPet, lastFedBy],
  );

  if (!props.isAlive) {
    return (
      <section aria-label="Interact">
        <h2 className="section-title">IN MEMORIAM</h2>
        <Panel className={styles.panel}>
          <p className={styles.memorial}>This Bagimon has passed and can no longer be cared for.</p>
          {counters}
        </Panel>
      </section>
    );
  }

  return (
    <section aria-label="Care for this Bagimon">
      <h2 className="section-title">CARE FOR {props.coinSymbol ? `$${props.coinSymbol}` : 'THIS BAGIMON'}</h2>
      <Panel className={`${styles.panel} ${bounce ? styles.bounce : ''}`}>
        {!connected ? (
          <div className={styles.gate}>
            <p className={styles.prompt}>Connect a Solana wallet to care for this Bagimon.</p>
            <WalletMultiButton />
          </div>
        ) : notHolder ? (
          <div className={styles.gate}>
            <p className={styles.prompt}>
              You need to hold {symbol} to interact.
            </p>
            <a
              className={styles.coinLink}
              href={`https://bags.fm/${props.coinMint}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get {symbol} on bags.fm ↗
            </a>
            <button className={styles.retry} onClick={verify} disabled={busy === 'verify'}>
              {busy === 'verify' ? 'checking…' : 'recheck balance'}
            </button>
          </div>
        ) : !verified ? (
          <div className={styles.gate}>
            <p className={styles.prompt}>Prove you hold {symbol} — a free signature, no gas.</p>
            <button className={styles.primary} onClick={verify} disabled={busy === 'verify'}>
              {busy === 'verify' ? 'check wallet…' : `Verify I hold ${symbol}`}
            </button>
            <WalletMultiButton />
          </div>
        ) : (
          <div className={styles.actions}>
            <div className={styles.buttons}>
              <button
                className={styles.feed}
                onClick={() => act('feed')}
                disabled={busy !== null || remaining('feed') > 0}
              >
                {remaining('feed') > 0 ? `🍖 ${Math.ceil(remaining('feed') / 1000)}s` : '🍖 Feed'}
              </button>
              <button
                className={styles.pet}
                onClick={() => act('pet')}
                disabled={busy !== null || remaining('pet') > 0}
              >
                {remaining('pet') > 0 ? `✋ ${Math.ceil(remaining('pet') / 1000)}s` : '✋ Pet'}
              </button>
            </div>
            {reaction ? <p className={styles.reaction}>{reaction}</p> : null}
            <p className={styles.connectedAs}>
              connected as {publicKey ? truncate(publicKey.toBase58()) : ''}
            </p>
          </div>
        )}
        {error ? <p className={styles.error}>{error}</p> : null}
        {counters}
      </Panel>
    </section>
  );
}
