'use client';

import { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { defineChain } from 'viem';
import { CHAIN_ID, RPC_URL } from '@/lib/chains';
import { injected } from 'wagmi/connectors';
import { sdk } from '@farcaster/miniapp-sdk';

// حاول نجبد Farcaster connector بأسماء محتملة عبر require (باش ما يكسرش الـ build)
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

// v2: connectors كخاصية function
const connectors = () => {
  const list: any[] = [injected({ shimDisconnect: true })];
  if (farcasterConnFactory) {
    try {
      const fc =
        farcasterConnFactory?.({ sdk }) ||
        farcasterConnFactory?.() ||
        null;
      if (fc) list.unshift(fc); // نعطيه الأولوية
    } catch {
      /* ignore */
    }
  }
  return list;
};

const config = createConfig({
  chains: [chain],
  transports: { [chain.id]: http(RPC_URL) },
  connectors,
});

export function WagmiProviders({ children }: { children: ReactNode }) {
  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}
