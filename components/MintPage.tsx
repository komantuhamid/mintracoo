'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { parseAbi, encodeFunctionData, isAddress } from 'viem';
import { sdk } from '@farcaster/miniapp-sdk';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useMiniEnv } from '@/hooks/useMiniEnv';

// ---------- helpers ----------
function normalizeAddress(input: string) {
  const cleaned = (input || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\s+/g, '')
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  return cleaned.startsWith('0x') ? cleaned : `0x${cleaned}`;
}

const RAW_ENV = process.env.NEXT_PUBLIC_NFT_CONTRACT ?? '';
const NORMAL = normalizeAddress(RAW_ENV);
const VALID =
  NORMAL.length === 42 && /^0x[0-9a-fA-F]{40}$/.test(NORMAL) && isAddress(NORMAL);

const CONTRACT_ADDRESS = (VALID ? NORMAL : '') as `0x${string}`;
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453);
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org';

// minimal ABI
const MINT_ABI = parseAbi([
  'function mintWithSignature((address,address,uint256,address,string,uint256,address,uint128,uint128,bytes32), bytes) payable returns (uint256)',
]);

export default function MintPage() {
  // wagmi (لخارج الميني فقط)
  const { address: wagmiAddress } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // mini env
  const { isMini, ctx } = useMiniEnv();

  // ui state
  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const shortAddr = useMemo(
    () => (activeAddress ? `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}` : ''),
    [activeAddress]
  );

  // pick active address
  useEffect(() => {
    if (isMini) {
      setActiveAddress(ctx?.user?.ethAddress ?? ctx?.user?.address ?? null);
    } else if (wagmiAddress) {
      setActiveAddress(wagmiAddress);
    } else {
      setActiveAddress(null);
    }
  }, [isMini, ctx?.user?.ethAddress, ctx?.user?.address, wagmiAddress]);

  // -------- Farcaster profile --------
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
        setProfile({
          display_name: j.display_name || ctx?.user?.displayName || '',
          username: j.username || ctx?.user?.username || '',
          pfp_url: j.pfp_url || ctx?.user?.pfpUrl || null,
          fid,
        });
      } catch (e) {
        console.error('pfp error', e);
      }
    })();
  }, [ctx?.user]);

  // -------- Connect buttons --------
  const connectMiniViaSDK = async () => {
    try {
      setMessage('Connecting mini wallet…');
      const actions: any = (sdk as any).actions;
      await actions?.ready?.();

      let addrs: string[] =
        (await actions?.wallet_getAddresses?.({ chainId: CHAIN_ID })) || [];

      if (!addrs.length && actions?.wallet_connect) {
        await actions.wallet_connect({ chainId: CHAIN_ID });
        addrs =
          (await actions?.wallet_getAddresses?.({ chainId: CHAIN_ID })) || [];
      }
      if (!addrs.length && actions?.wallet_requestAddresses) {
        await actions.wallet_requestAddresses({ chainId: CHAIN_ID });
        addrs =
          (await actions?.wallet_getAddresses?.({ chainId: CHAIN_ID })) || [];
      }

      if (addrs[0]) {
        setActiveAddress(addrs[0]);
        setMessage('Mini wallet connected');
      } else {
        setMessage('No mini wallet address returned');
      }
    } catch (e: any) {
      setMessage(e?.message || String(e));
    }
  };

  const connectBrowser = async () => {
    try {
      const eth = (window as any).ethereum;
      if (!eth?.request) return setMessage('No EVM wallet in browser');
      const accs: string[] = await eth.request({ method: 'eth_requestAccounts' });
      if (accs?.[0]) {
        setActiveAddress(accs[0]);
        setMessage('Browser wallet connected');
      } else setMessage('No account selected');
    } catch (e: any) {
      setMessage(e?.message || String(e));
    }
  };

  // Auto-connect in mini once
  const tried = useRef(false);
  useEffect(() => {
    if (isMini && !activeAddress && !tried.current) {
      tried.current = true;
      connectMiniViaSDK();
    }
  }, [isMini, activeAddress]);

  const disconnectAll = () => {
    setActiveAddress(null);
    disconnect();
    setMessage('Disconnected');
  };

  // -------- Generate art --------
  const generateRaccoon = async () => {
    setLoading(true);
    setMessage('Generating raccoon pixel art…');
    try {
      const res = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: 'premium collectible raccoon pixel portrait 1024x1024',
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Generation failed');
      setGeneratedImage(j.generated_image_url || j.imageUrl || j.url);
      setMessage('Done! You can mint now.');
    } catch (e: any) {
      setMessage(e?.message || 'Generation error');
    } finally {
      setLoading(false);
    }
  };

  // -------- Signed mint payload (server) --------
  const requestSignedMint = async () => {
    const r = await fetch('/api/create-signed-mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: activeAddress,
        imageUrl: generatedImage,
        username: profile?.username,
        fid: profile?.fid,
      }),
    });
    const j = await r.json();
    if (!r.ok || j.error) throw new Error(j.error || 'Sign mint failed');
    return j as { mintRequest: any; signature: `0x${string}`; priceWei: string };
  };

  // -------- Mint --------
  const performMint = async () => {
    if (!VALID) {
      return setMessage(
        `Invalid contract address in env: ${
          NORMAL ? NORMAL.slice(0, 6) + '…' + NORMAL.slice(-4) : 'empty'
        } (len=${NORMAL.length})`
      );
    }
    if (!activeAddress) return setMessage('Connect wallet first');
    if (!generatedImage) return setMessage('Generate image first');

    setMinting(true);
    setMessage('');

    try {
      const { mintRequest, signature, priceWei } = await requestSignedMint();

      const data = encodeFunctionData({
        abi: MINT_ABI,
        functionName: 'mintWithSignature',
        args: [mintRequest, signature],
      });

      // ALWAYS hex for both paths to نتهنّاو
      const valueHex =
        priceWei && priceWei !== '0' ? ('0x' + BigInt(priceWei).toString(16)) : undefined;

      const actions: any = (sdk as any).actions;

      if (isMini) {
        // داخل Farcaster: استعمل SDK فقط — ماشي window.ethereum
        if (actions?.wallet_sendCalls) {
          await actions.wallet_sendCalls({
            chainId: CHAIN_ID,
            calls: [{ to: CONTRACT_ADDRESS, data, ...(valueHex ? { value: valueHex } : {}) }],
          });
          setMessage('Transaction sent via Mini App wallet. Confirm in wallet.');
          setMinting(false);
          return;
        }
        if (actions?.wallet_sendTransaction) {
          await actions.wallet_sendTransaction({
            chainId: CHAIN_ID,
            to: CONTRACT_ADDRESS,
            data,
            ...(valueHex ? { value: valueHex } : {}),
          });
          setMessage('Transaction sent via Mini App wallet. Confirm in wallet.');
          setMinting(false);
          return;
        }
        // لا fallback لwindow.ethereum داخل الميني باش مانشدوش e.on is not a function
        setMessage('Mini wallet API not available in this client.');
        setMinting(false);
        return;
      }

      // Browser fallback فقط خارج الميني
      const eth = (window as any).ethereum;
      if (eth?.request) {
        const txHash: string = await eth.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: activeAddress,
              to: CONTRACT_ADDRESS,
              data,
              ...(valueHex ? { value: valueHex } : {}),
            },
          ],
        });
        setMessage(`Tx submitted: ${txHash.slice(0, 10)}… waiting confirmation…`);

        // (اختياري) poll receipt
        const poll = async () => {
          const res = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getTransactionReceipt',
              params: [txHash],
            }),
          });
          const jr = await res.json();
          return jr?.result || null;
        };
        for (let i = 0; i < 30; i++) {
          const rcpt = await poll();
          if (rcpt) {
            setMessage('Mint confirmed ✅');
            break;
          }
          await new Promise((s) => setTimeout(s, 2000));
        }
        setMinting(false);
        return;
      }

      setMessage('No wallet available.');
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message || String(e) || 'Mint failed');
    } finally {
      setMinting(false);
    }
  };

  // -------- UI --------
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white p-6">
      <div className="max-w-3xl mx-auto bg-slate-800/40 rounded-2xl p-6 shadow-xl">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">Raccoon Pixel Art Mint</h1>

          {activeAddress ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-300">
                {profile?.username ? `@${profile.username}` : shortAddr}
              </span>
              <button
                onClick={disconnectAll}
                className="px-3 py-1 bg-red-600 rounded hover:bg-red-500 text-sm"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              {isMini ? (
                <button
                  onClick={connectMiniViaSDK}
                  className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500"
                >
                  Connect (Mini)
                </button>
              ) : (
                <button
                  onClick={connectBrowser}
                  className="px-4 py-2 bg-slate-600 rounded hover:bg-slate-500"
                >
                  Connect (Browser)
                </button>
              )}
            </div>
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
                {minting ? 'Minting…' : 'Mint 0.0001 ETH'}
              </button>
            </div>

            {message && <div className="mt-3 text-sm text-amber-200 break-words">{message}</div>}
          </section>

          <aside className="space-y-4">
            <div className="bg-slate-900/30 p-4 rounded-lg text-center">
              {profile?.pfp_url && (
                <img
                  src={profile.pfp_url}
                  alt="pfp"
                  className="w-24 h-24 rounded-full mx-auto mb-2"
                />
              )}
              <h3 className="font-bold">{profile?.display_name || 'Profile'}</h3>
              <div className="text-sm text-slate-300">@{profile?.username || ''}</div>
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
