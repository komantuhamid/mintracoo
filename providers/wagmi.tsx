'use client';
import { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { defineChain } from 'viem';
import { CHAIN_ID, RPC_URL } from '@/lib/chains';

const chain = defineChain({ id: CHAIN_ID, name: 'EVM', nativeCurrency: { name:'ETH', symbol:'ETH', decimals:18 }, rpcUrls: { default: { http: [RPC_URL] } } });

const config = createConfig({ chains: [chain], transports: { [chain.id]: http(RPC_URL) } });

export function WagmiProviders({ children }: { children: ReactNode }) {
  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}
