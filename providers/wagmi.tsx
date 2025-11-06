'use client';
import { ReactNode, useMemo } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { defineChain } from 'viem';
import { CHAIN_ID, RPC_URL } from '@/lib/chains';
import { injected } from 'wagmi/connectors';
import { sdk } from '@farcaster/miniapp-sdk';

// نحاول نجيب Farcaster connector من الباكدج، مع fallback آمن
let farcasterConnFactory: any = null;
try {
  // بعض النسخ كتصدّر farcasterConnector
  // وبعضها farcasterMiniAppConnector / farcaster
  // نجرّب أشهر الأسماء:
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

// connectors كخاصية function فـ wagmi v2
const connectors = () => {
  const list: any[] = [injected({ shimDisconnect: true })];
  if (farcasterConnFactory) {
    try {
      // أغلب الإصدارات كتقبل { sdk } أو بدون خيارات
      const fc =
        farcasterConnFactory?.({ sdk }) ||
        farcasterConnFactory?.() ||
        null;
      if (fc) list.unshift(fc);
    } catch {
      // ignore
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
