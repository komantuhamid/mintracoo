'use client';
import React, { useEffect, useState } from 'react';
import { parseAbi, encodeFunctionData, toHex } from 'viem';
import { sdk } from '@farcaster/miniapp-sdk';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useMiniEnv } from '@/hooks/useMiniEnv';
import { CHAIN_ID, CONTRACT_ADDRESS } from '@/lib/chains';

type AnyActions = any;

const MINT_ABI = parseAbi([
  'function mintWithSignature((address,address,uint256,address,string,uint256,address,uint128,uint128,bytes32), bytes) payable returns (uint256)',
]);

export default function MintPage() {
  const { address: wagmiAddress } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { isMini, ctx } = useMiniEnv();

  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const [farcasterProfile, setFarcasterProfile] = useState<any>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // أولوية لعنوان wagmi، وإلا نأخذ العنوان من Mini App context
  useEffect(() => {
    if (wagmiAddress) {
      setActiveAddress(wagmiAddress);
    } else if (isMini) {
      setActiveAddress(ctx?.user?.ethAddress ?? ctx?.user?.address ?? null);
    } else {
      setActiveAddress(null);
    }
  }, [wagmiAddress, isMini, ctx?.user?.ethAddress, ctx?.user?.address]);

  // جلب بروفايل Farcaster إن توفر
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

  // Auto-connect داخل Warpcast (Farcaster connector عبر wagmi)
  useEffect(() => {
    (async () => {
      try {
        if (!isMini) return;
        if (activeAddress) return;
        await (sdk as any).actions?.ready?.();
        const farcaster = connectors.find(
          (c) =>
            c.id?.toLowerCase().includes('farcaster') ||
            c.name?.toLowerCase().includes('farcaster')
        );
        if (farcaster) {
          await connect({ connector: farcaster });
          const acc = (await (sdk as any).actions?.wallet_getAddresses?.({ chainId: CHAIN_ID }))?.[0];
          if (acc) setActiveAddress(acc);
          setMessage('Mini wallet connected (auto)');
        }
      } catch (e) {
        console.log('Auto-connect (mini) failed:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMini, connectors]);

  // ⬇️ توليد صورة Pixel Art Raccoon باستعمال HF (text→image) + رسائل أخطاء واضحة
  const generateRaccoon = async () => {
    setLoading(true);
    setMessage('Generating raccoon pixel art…');
    setGeneratedImage(null);
    try {
      const r = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // فنسخة HF كنستعملو style فقط (ماشي pfp_url)
        body: JSON.stringify({ style: 'premium collectible, polished, vibrant' }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMessage(
          (j?.error || 'Generation failed') +
            (j?.details ? ` — ${typeof j.details === 'string' ? j.details.slice(0, 180) : JSON.stringify(j.details).slice(0, 180)}` : '')
        );
        setLoading(false);
        return;
      }
      setGeneratedImage(j.generated_image_url);
      setMessage('Done! You can mint now.');
    } catch (e: any) {
      setMessage(e?.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  // طلب توقيع mint من الـ backend (نفس الخدمة السابقة)
  const requestSignedMint = async () => {
    const res = await fetch('/api/create-signed-mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: activeAddress,
        image_url: generatedImage,
        username: farcasterProfile?.username,
        fid: farcasterProfile?.fid,
      }),
    });
    const j = await res.json();
    if (j.error) throw new Error(j.error);
    return j; // { mintRequest, signature, priceWei }
  };

  const performMint = async () => {
    if (!activeAddress) return setMessage('Connect wallet first');
    if (!generatedImage) return setMessage('Generate image first');
    setMinting(true); setMessage(null);
    try {
      const { mintRequest, signature, priceWei } = await requestSignedMint();
      const data = encodeFunctionData({
        abi: MINT_ABI,
        functionName: 'mintWithSignature',
        args: [mintRequest, signature],
      });

      if (isMini) {
        const actions: AnyActions = (sdk as any).actions;
        if (actions && typeof actions.wallet_sendCalls === 'function') {
          await actions.wallet_sendCalls({
            chainId: CHAIN_ID,
            calls: [{ to: CONTRACT_ADDRESS, data, value: toHex(BigInt(priceWei || '0')) }],
          });
        } else if (actions && typeof actions.wallet_sendTransaction === 'function') {
          await actions.wallet_sendTransaction({
            chainId: CHAIN_ID,
            to: CONTRACT_ADDRESS,
            data,
            value: toHex(BigInt(priceWei || '0')),
          });
        } else {
          throw new Error('Mini App wallet send is not available in this SDK version');
        }
        setMessage('Transaction submitted via Mini App wallet');
      } else if ((window as any).ethereum) {
        const txHash = await (window as any).ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: activeAddress,
            to: CONTRACT_ADDRESS,
            data,
            value: toHex(BigInt(priceWei || '0')),
          }],
        });
        setMessage('Submitted: ' + txHash);
      } else setMessage('No wallet provider');
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

          <div className="flex items-center gap-3">
            {activeAddress ? (
              <div className="flex items-center gap-3">
                <div className="text-sm text-slate-300">
                  {farcasterProfile?.username
                    ? `@${farcasterProfile.username}`
                    : `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`}
                </div>
                <button
                  onClick={() => { if (isMini) setActiveAddress(null); else disconnect(); }}
                  className="px-3 py-1 bg-red-600 rounded hover:bg-red-500 text-sm"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                {isMini ? (
                  <button
                    onClick={async () => {
                      try {
                        const anyActions: any = (sdk as any).actions;
                        if (typeof anyActions?.ready === 'function') await anyActions.ready();
                        const farcaster = connectors.find(
                          (c) =>
                            c.id?.toLowerCase().includes('farcaster') ||
                            c.name?.toLowerCase().includes('farcaster')
                        );
                        if (farcaster) {
                          await connect({ connector: farcaster });
                          const acc = (await (sdk as any).actions?.wallet_getAddresses?.({ chainId: CHAIN_ID }))?.[0];
                          if (acc) setActiveAddress(acc);
                          setMessage('Mini wallet connected');
                        } else {
                          setMessage('Farcaster connector not found — update deps');
                        }
                      } catch (e: any) {
                        console.error(e);
                        setMessage(e?.message || 'Mini wallet connect failed');
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500"
                  >
                    Connect (Mini)
                  </button>
                ) : (
                  <div className="flex gap-2">
                    {connectors.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => connect({ connector: c })}
                        className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="col-span-2 space-y-4">
            <div className="bg-slate-900/30 rounded-lg p-4">
              <div className="h-64 w-full bg-black rounded-md flex items-center justify-center overflow-hidden">
                {generatedImage ? (
                  <img src={generatedImage} alt="Generated" className="object-cover h-full w-full" />
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
              {farcasterProfile?.pfp_url ? (
                <img
                  src={farcasterProfile.pfp_url}
                  alt="pfp"
                  className="w-24 h-24 rounded-full mx-auto mb-2"
                />
              ) : null}
              <h3 className="font-bold">{farcasterProfile?.display_name || 'Profile'}</h3>
              <div className="text-sm text-slate-300">@{farcasterProfile?.username || ''}</div>
            </div>

            <div className="bg-slate-900/30 p-4 rounded-lg text-sm text-slate-300">
              <div className="font-semibold">Mint info</div>
              <div className="mt-2">Price: <span className="font-medium">0.0001 ETH</span></div>
              <div>Supply cap: <span className="font-medium">5000</span></div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
