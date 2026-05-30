'use client';

import { useMemo, type ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import '@solana/wallet-adapter-react-ui/styles.css';

const FALLBACK_RPC = 'https://api.mainnet-beta.solana.com';

export function BagimonWalletProvider({ children }: { children: ReactNode }) {
  // Public, read-only RPC. Safe to expose; used by the wallet adapter for the
  // connection. Falls back to public mainnet if the Helius URL isn't set.
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? FALLBACK_RPC;
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
