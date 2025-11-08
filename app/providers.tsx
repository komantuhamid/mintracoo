'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { coinbaseWallet } from 'wagmi/connectors';
import { ReactNode } from 'react';

// ===== WAGMI CONFIG =====
const config = createConfig({
  chains: [base],
  connectors: [
    farcasterMiniApp(), // ✅ Farcaster Mini App connector
    coinbaseWallet({
      appName: 'Raccoon Pixel Art Mint',
    }),
  ],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
  },
  ssr: true,
});

const queryClient = new QueryClient();

// ===== PROVIDER COMPONENT =====
export function RootProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
