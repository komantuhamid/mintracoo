'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { coinbaseWallet } from 'wagmi/connectors';
import { ReactNode } from 'react';

const config = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'Crypto Tower Climb',
    }),
  ],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

// Changed from "Providers" to "RootProvider" to match your layout.tsx
export function RootProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
