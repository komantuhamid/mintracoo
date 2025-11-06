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

  // اختار العنوان النشيط حسب البيئة
  useEffect(() => {
    setActiveAddress(isMini ? (ctx?.user?.ethAddress ?? null) : (wagmiAddress ?? null));
  }, [isMini, ctx?.user?.ethAddress, wagmiAddress]);

  // جلب بروفايل Farcaster
  useEffect(() => {
    if (ctx?.user?.fid) {
      (async () => {
        try {
          const r = await fetch('/api/fetch-pfp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fid: ctx.user.fid }),
          });
          const j = await r.json();
          setFarcasterProfile(j);
        } catch (e) { console.error(e); }
      })();
    }
  }, [ctx?.user?.fid]);

  // ✅ Auto-connect داخل Warpcast باستعمال Farcaster connector ديال wagmi
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
          setMessage('Mini wallet connected (auto)');
        }
      } catch (e) {
        console.log('Auto-connect (mini) failed:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMini, connectors]);

  const generateRaccoon = async () => {
    if (!farcasterProfile?.pfp_url) return setMessage('No PFP URL — open from Warpcast or provide an image');
    setLoading(true); setMessage('Generating raccoon pixel art...');
    try {
      const r = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pfp_url: farcasterProfile.pfp_url, style: 'pixel art raccoon' }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setGeneratedImage(j.generated_image_url);
      setMessage('Done! You can mint now.');
    } catch (e: any) { setMessage(e?.message || 'Generation failed'); }
    finally { setLoading(false); }
  };

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
    } catch (e: any) { setMessage(e?.message || 'Mint failed'); }
    finally { setMinting(false); }
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

            {message && <div className="mt-3 text-sm text-amber-200">{message}</div>}
          </section>

          <aside className="space-y-4">
            <div className="bg-slate-900/30 p-4 rounded-lg">
              <h3 className="font-bold">Profile</h3>
              <div className="mt-2 text-sm text-slate-300">
                {farcasterProfile ? (
                  <>
                    <div className="font-medium">{farcasterProfile.display_name}</div>
                    <div className="text-xs">@{farcasterProfile.username}</div>
                  </>
                ) : (
                  'No Farcaster profile loaded'
                )}
              </div>
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
