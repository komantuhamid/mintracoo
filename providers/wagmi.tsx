'use client';

import { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { defineChain } from 'viem';
import { CHAIN_ID, RPC_URL } from '@/lib/chains';
import { injected } from 'wagmi/connectors';
import { sdk } from '@farcaster/miniapp-sdk';

let farcasterConnFactory: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fc = require('@farcaster/miniapp-wagmi-connector');
  farcasterConnFactory =
    fc?.farcasterConnector ||
    fc?.farcasterMiniAppConnector ||
    fc?.farcaster ||
    null;
} catch {
  farcasterConnFactory = null;
}

const chain = defineChain({
  id: CHAIN_ID,
  name: 'EVM',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const connectorsArr: any[] = [];
if (farcasterConnFactory) {
  try {
    const farcaster =
      farcasterConnFactory?.({ sdk }) ||
      farcasterConnFactory?.() ||
      null;
    if (farcaster) connectorsArr.push(farcaster);
  } catch { /* ignore */ }
}
connectorsArr.push(injected({ shimDisconnect: true }));

const config = createConfig({
  chains: [chain],
  transports: { [chain.id]: http(RPC_URL) },
  connectors: connectorsArr as any,
});

export function WagmiProviders({ children }: { children: ReactNode }) {
  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}
