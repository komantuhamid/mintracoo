'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { parseAbi, encodeFunctionData, isAddress } from 'viem';
import { sdk } from '@farcaster/miniapp-sdk';
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

const RAW = process.env.NEXT_PUBLIC_NFT_CONTRACT ?? '';
const NORMAL = normalizeAddress(RAW);
const VALID =
  NORMAL.length === 42 && /^0x[0-9a-fA-F]{40}$/.test(NORMAL) && isAddress(NORMAL);

const CONTRACT = (VALID ? NORMAL : '') as `0x${string}`;
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453);
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org';

// minimal ABI
const MINT_ABI = parseAbi([
  'function mintWithSignature((address,address,uint256,address,string,uint256,address,uint128,uint128,bytes32), bytes) payable returns (uint256)',
]);

export default function MintPage() {
  const { isMini, ctx } = useMiniEnv();

  // state
  const [address, setAddress] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [img, setImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const short = useMemo(
    () => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''),
    [address]
  );

  // ----- Farcaster profile -----
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
        console.log('pfp error', e);
      }
    })();
  }, [ctx?.user]);

  // ----- Mini connect (no wagmi) -----
  const connectMini = async () => {
    try {
      setMsg('Connecting mini wallet…');
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
        setAddress(addrs[0]);
        setMsg('Mini wallet connected');
      } else {
        setMsg('No mini wallet address returned');
      }
    } catch (e: any) {
      console.log('mini connect error', e);
      setMsg(e?.message || String(e));
    }
  };

  // Auto-connect inside Farcaster once
  const triedAuto = useRef(false);
  useEffect(() => {
    if (isMini && !address && !triedAuto.current) {
      triedAuto.current = true;
      // نجرب مباشرة ملي تفتح الميني آب
      connectMini();
    }
  }, [isMini, address]);

  // ----- Browser connect (MetaMask/EIP-1193) -----
  const connectBrowser = async () => {
    try {
      const eth = (window as any).ethereum;
      if (!eth?.request) return setMsg('No EVM wallet in browser');
      const accs: string[] = await eth.request({ method: 'eth_requestAccounts' });
      if (accs?.[0]) {
        setAddress(accs[0]);
        setMsg('Browser wallet connected');
      } else setMsg('No account selected');
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  };

  const disconnect = () => {
    setAddress(null);
    setMsg('Disconnected');
  };

  // ----- Generate art -----
  const generate = async () => {
    setLoading(true);
    setMsg('Generating raccoon pixel art…');
    try {
      const r = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: 'premium collectible raccoon pixel portrait 1024x1024',
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Generation failed');
      setImg(j.generated_image_url || j.imageUrl || j.url);
      setMsg('Done! You can mint now.');
    } catch (e: any) {
      setMsg(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // ----- Signed payload from server -----
  const getSignedMint = async () => {
    const r = await fetch('/api/create-signed-mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address,
        imageUrl: img,
        username: profile?.username,
        fid: profile?.fid,
      }),
    });
    const j = await r.json();
    if (!r.ok || j.error) throw new Error(j.error || 'Sign mint failed');
    return j as { mintRequest: any; signature: `0x${string}`; priceWei: string };
  };

  // ----- Mint (Mini or Browser) -----
  const mint = async () => {
    if (!VALID) {
      return setMsg(
        `Invalid contract address in env: ${
          NORMAL ? NORMAL.slice(0, 6) + '…' + NORMAL.slice(-4) : 'empty'
        } (len=${NORMAL.length})`
      );
    }
    if (!address) return setMsg('Connect wallet first');
    if (!img) return setMsg('Generate image first');

    setMinting(true);
    setMsg('');

    try {
      const { mintRequest, signature, priceWei } = await getSignedMint();

      const data = encodeFunctionData({
        abi: MINT_ABI,
        functionName: 'mintWithSignature',
        args: [mintRequest, signature],
      });

      const valueDec = priceWei && priceWei !== '0' ? String(BigInt(priceWei)) : undefined; // Mini
      const valueHex = priceWei && priceWei !== '0' ? '0x' + BigInt(priceWei).toString(16) : undefined; // Browser

      const miniCall = { to: CONTRACT, data, ...(valueDec ? { value: valueDec } : {}) };
      const browserCall = { to: CONTRACT, data, ...(valueHex ? { value: valueHex } : {}) };

      const actions: any = (sdk as any).actions;

      // Mini path
      if (isMini && actions?.wallet_sendCalls) {
        await actions.wallet_sendCalls({ chainId: CHAIN_ID, calls: [miniCall] });
        setMsg('Transaction sent via Mini App wallet. Confirm in wallet.');
        setMinting(false);
        return;
      }
      if (isMini && actions?.wallet_sendTransaction) {
        await actions.wallet_sendTransaction({ chainId: CHAIN_ID, ...miniCall });
        setMsg('Transaction sent via Mini App wallet. Confirm in wallet.');
        setMinting(false);
        return;
      }

      // Browser path
      const eth = (window as any).ethereum;
      if (eth?.request) {
        const hash: string = await eth.request({
          method: 'eth_sendTransaction',
          params: [{ from: address, ...browserCall }],
        });

        setMsg(`Tx submitted: ${hash.slice(0, 10)}… Waiting confirmation…`);

        // Optional: poll receipt
        const poll = async () => {
          const res = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getTransactionReceipt',
              params: [hash],
            }),
          });
          const jr = await res.json();
          return jr?.result || null;
        };
        for (let i = 0; i < 30; i++) {
          const rcpt = await poll();
          if (rcpt) {
            setMsg('Mint confirmed ✅');
            break;
          }
          await new Promise((s) => setTimeout(s, 2000));
        }
        setMinting(false);
        return;
      }

      setMsg('No wallet available.');
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || String(e) || 'Mint failed');
    } finally {
      setMinting(false);
    }
  };

  // ----- UI -----
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white p-6">
      <div className="max-w-3xl mx-auto bg-slate-800/40 rounded-2xl p-6 shadow-xl">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">Raccoon Pixel Art Mint</h1>

          {address ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-300">
                {profile?.username ? `@${profile.username}` : short}
              </span>
              <button
                onClick={disconnect}
                className="px-3 py-1 bg-red-600 rounded hover:bg-red-500 text-sm"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              {isMini && (
                <button
                  onClick={connectMini}
                  className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500"
                >
                  Connect (Mini)
                </button>
              )}
              <button
                onClick={connectBrowser}
                className="px-4 py-2 bg-slate-600 rounded hover:bg-slate-500"
              >
                Connect (Browser)
              </button>
            </div>
          )}
        </header>

        <main className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="col-span-2 space-y-4">
            <div className="bg-slate-900/30 rounded-lg p-4">
              <div className="w-full aspect-square bg-black rounded-md overflow-hidden flex items-center justify-center">
                {img ? (
                  <img
                    src={img}
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
                onClick={generate}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-pink-600 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Generating…' : 'Generate Raccoon Pixel Art'}
              </button>
              <button
                onClick={mint}
                disabled={minting || !address || !img}
                className="px-4 py-3 bg-emerald-600 rounded-lg font-semibold disabled:opacity-50"
              >
                {minting ? 'Minting…' : 'Mint 0.0001 ETH'}
              </button>
            </div>

            {msg && <div className="mt-3 text-sm text-amber-200 break-words">{msg}</div>}
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
