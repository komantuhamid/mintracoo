'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  parseAbi,
  encodeFunctionData,
  toHex,
  isAddress,
  parseEther,
} from 'viem';
import { sdk } from '@farcaster/miniapp-sdk';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { useMiniEnv } from '@/hooks/useMiniEnv';

type AnyActions = any;

// ====== Clean and Validate ENV ======
function normalizeAddress(input: string) {
  const cleaned = input
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\s+/g, '')
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  const with0x = cleaned.startsWith('0x') ? cleaned : `0x${cleaned}`;
  return with0x;
}

const RAW_ENV = process.env.NEXT_PUBLIC_NFT_CONTRACT ?? '';
const NORMALIZED_ADDR = normalizeAddress(RAW_ENV);

const ENV_ADDRESS_VALID =
  NORMALIZED_ADDR.length === 42 &&
  /^0x[0-9a-fA-F]{40}$/.test(NORMALIZED_ADDR) &&
  isAddress(NORMALIZED_ADDR);

const CONTRACT_ADDRESS = (ENV_ADDRESS_VALID ? NORMALIZED_ADDR : '') as `0x${string}`;
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453);

// ===== minimal ABI =====
const MINT_ABI = parseAbi([
  'function mintWithSignature((address,address,uint256,address,string,uint256,address,uint128,uint128,bytes32), bytes) payable returns (uint256)',
]);

export default function MintPage() {
  const { address: wagmiAddress, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const { data: txHash, sendTransactionAsync } = useSendTransaction();
  const { isLoading: txPending } = useWaitForTransactionReceipt({ hash: txHash });

  const { isMini, ctx } = useMiniEnv();

  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const [farcasterProfile, setFarcasterProfile] = useState<any>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Pick wallet
  useEffect(() => {
    if (wagmiAddress) {
      setActiveAddress(wagmiAddress);
    } else if (isMini) {
      setActiveAddress(ctx?.user?.ethAddress ?? ctx?.user?.address ?? null);
    } else {
      setActiveAddress(null);
    }
  }, [wagmiAddress, isMini, ctx?.user?.ethAddress, ctx?.user?.address]);

  const shortAddr = useMemo(
    () => (activeAddress ? `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}` : ''),
    [activeAddress]
  );

  // Farcaster profile
  useEffect(() => {
    const fid = ctx?.user?.fid || ctx?.user?.id;
    if (!fid) return;
    (async () => {
      try {
        const r = await fetch('/api/fetch-pfp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid }),
        });
        const j = await r.json();
        setFarcasterProfile({
          display_name:
            j.display_name || j.name || ctx?.user?.displayName || ctx?.user?.name || '',
          username: j.username || ctx?.user?.username || '',
          pfp_url: j.pfp_url || ctx?.user?.pfpUrl || ctx?.user?.pfp || null,
          fid,
        });
      } catch (e) {
        console.error('Error fetching Farcaster profile:', e);
      }
    })();
  }, [ctx?.user]);

  // Auto-connect mini
  useEffect(() => {
    (async () => {
      try {
        if (!isMini || activeAddress) return;
        await (sdk as any).actions?.ready?.();
        const farcaster = connectors.find(
          (c) =>
            c.id?.toLowerCase().includes('farcaster') ||
            c.name?.toLowerCase().includes('farcaster')
        );
        if (farcaster) {
          await connect({ connector: farcaster });
          const acc =
            (await (sdk as any).actions?.wallet_getAddresses?.({ chainId: CHAIN_ID }))?.[0];
          if (acc) setActiveAddress(acc);
          setMessage('Mini wallet connected');
        }
      } catch (e) {
        console.log('Mini auto connect failed', e);
      }
    })();
  }, [isMini, connectors, activeAddress]);

  // Generate art
  const generateRaccoon = async () => {
    setLoading(true);
    setMessage('Generating raccoon pixel art…');
    try {
      const res = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: 'premium collectible raccoon pixel portrait' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setGeneratedImage(data.generated_image_url || data.imageUrl || data.url);
      setMessage('Done! You can mint now.');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  const requestSignedMint = async () => {
    const res = await fetch('/api/create-signed-mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: activeAddress,
        imageUrl: generatedImage,
        username: farcasterProfile?.username,
        fid: farcasterProfile?.fid,
      }),
    });
    const j = await res.json();
    if (!res.ok || j.error) throw new Error(j.error || 'Sign mint failed');
    return j as { mintRequest: any; signature: `0x${string}`; priceWei: string };
  };

  const performMint = async () => {
    if (!ENV_ADDRESS_VALID) {
      return setMessage(
        `Invalid contract address in env: ${
          NORMALIZED_ADDR ? NORMALIZED_ADDR.slice(0, 6) + '…' + NORMALIZED_ADDR.slice(-4) : 'empty'
        } (len=${NORMALIZED_ADDR.length})`
      );
    }
    if (!activeAddress) return setMessage('Connect wallet first');
    if (!generatedImage) return setMessage('Generate image first');

    setMinting(true);
    setMessage(null);

    try {
      const { mintRequest, signature, priceWei } = await requestSignedMint();

      const data = encodeFunctionData({
        abi: MINT_ABI,
        functionName: 'mintWithSignature',
        args: [mintRequest, signature],
      });

      const hexValue =
        priceWei && priceWei !== '0' ? toHex(BigInt(String(priceWei))) : undefined;

      const call = { to: CONTRACT_ADDRESS, data, ...(hexValue ? { value: hexValue } : {}) };

      const actions: AnyActions = (sdk as any).actions;
      if (isMini && actions?.wallet_sendCalls) {
        await actions.wallet_sendCalls({ chainId: CHAIN_ID, calls: [call] });
        setMessage('Transaction sent via Mini App wallet');
      } else if (isMini && actions?.wallet_sendTransaction) {
        await actions.wallet_sendTransaction({ chainId: CHAIN_ID, ...call });
        setMessage('Transaction sent via Mini App wallet');
      } else if (isConnected && sendTransactionAsync) {
        await sendTransactionAsync({
          to: CONTRACT_ADDRESS,
          data: call.data as `0x${string}`,
          ...(hexValue ? { value: parseEther((Number(priceWei) / 1e18).toString()) } : {}),
        });
        setMessage('Transaction submitted (wagmi)');
      } else {
        const txHash = await (window as any).ethereum?.request({
          method: 'eth_sendTransaction',
          params: [{ from: activeAddress, ...call }],
        });
        setMessage('Submitted: ' + txHash);
      }
    } catch (e: any) {
      setMessage(e?.message || 'Mint failed');
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white p-6">
      <div className="max-w-3xl mx-auto bg-slate-800/40 rounded-2xl p-6 shadow-xl">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">Raccoon Pixel Art Mint</h1>
          {activeAddress ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-300">
                {farcasterProfile?.username
                  ? `@${farcasterProfile.username}`
                  : shortAddr}
              </span>
              <button
                onClick={() => (isMini ? setActiveAddress(null) : disconnect())}
                className="px-3 py-1 bg-red-600 rounded hover:bg-red-500 text-sm"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500"
            >
              Connect
            </button>
          )}
        </header>

        <main className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="col-span-2 space-y-4">
            <div className="bg-slate-900/30 rounded-lg p-4">
              <div className="w-full aspect-square bg-black rounded-md overflow-hidden flex items-center justify-center">
                {generatedImage ? (
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="h-full w-full object-cover"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <div className="text-slate-400">No image generated yet</div>
                )}
              </div>
            </div>

            <div className="bg-slate-900/20 p-4 rounded-lg flex gap-3">
              <button
                onClick={generateRaccoon}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-pink-600 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Generating…' : 'Generate Raccoon Pixel Art'}
              </button>
              <button
                onClick={performMint}
                disabled={minting || !activeAddress || !generatedImage}
                className="px-4 py-3 bg-emerald-600 rounded-lg font-semibold disabled:opacity-50"
              >
                {minting || txPending ? 'Minting…' : 'Mint 0.0001 ETH'}
              </button>
            </div>

            {message && <div className="mt-3 text-sm text-amber-200">{message}</div>}
          </section>

          <aside className="space-y-4">
            <div className="bg-slate-900/30 p-4 rounded-lg text-center">
              {farcasterProfile?.pfp_url && (
                <img
                  src={farcasterProfile.pfp_url}
                  alt="pfp"
                  className="w-24 h-24 rounded-full mx-auto mb-2"
                />
              )}
              <h3 className="font-bold">{farcasterProfile?.display_name || 'Profile'}</h3>
              <div className="text-sm text-slate-300">
                @{farcasterProfile?.username || ''}
              </div>
            </div>

            <div className="bg-slate-900/30 p-4 rounded-lg text-sm text-slate-300">
              <div className="font-semibold">Mint info</div>
              <div className="mt-2">Price: 0.0001 ETH</div>
              <div>Supply cap: 5000</div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
