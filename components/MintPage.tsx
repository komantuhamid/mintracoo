'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { parseAbi, encodeFunctionData, parseEther } from 'viem';
import sdk from '@farcaster/miniapp-sdk';
import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';

const CONTRACT_ADDRESS = '0x1c60072233E9AdE9312d35F36a130300288c27F0' as `0x${string}`;
const MINT_ABI = parseAbi(['function mint(string memory tokenURI_) payable']);

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendTransaction, isPending, data: txHash } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const [profile, setProfile] = useState<any>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);

  const shortAddr = useMemo(
    () => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''),
    [address]
  );

  useEffect(() => {
    const init = async () => {
      try {
        await sdk.actions.ready();
        setIsAppReady(true);
      } catch (e) {
        setIsAppReady(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!isAppReady || isConnected) return;
    const autoConnect = async () => {
      try {
        const context = await sdk.context;
        if (context?.user && connectors.length > 0) {
          await connect({ connector: connectors[0] });
        }
      } catch (e) {}
    };
    autoConnect();
  }, [isAppReady, isConnected, connectors, connect]);

  useEffect(() => {
    if (!isConnected) return;
    (async () => {
      try {
        const context = await sdk.context;
        const fid = context?.user?.fid;
        if (!fid) return;
        const r = await fetch('/api/fetch-pfp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid }),
        });
        const j = await r.json();
        setProfile({
          display_name: j.display_name || "",
          username: j.username || "",
          pfp_url: j.pfp_url || '/default-pfp.png',
          fid,
        });
      } catch (e) {}
    })();
  }, [isConnected]);

  useEffect(() => {
    if (isPending) setMessage('⏳ Confirm in wallet...');
    else if (isConfirming) setMessage('⏳ Confirming...');
    else if (isConfirmed) setMessage('🎉 NFT Minted Successfully!');
  }, [isPending, isConfirming, isConfirmed]);

  const generateRaccoon = async () => {
    setLoading(true);
    setMessage('🎨 Generating...');
    try {
      const res = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: 'pixel raccoon' }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Failed');
      setGeneratedImage(j.generated_image_url || j.imageUrl);
      setMessage('✅ Ready to mint!');
    } catch (e: any) {
      setMessage(`❌ ${e?.message}`);
    } finally {
      setLoading(false);
    }
  };

  const performMint = async () => {
    if (!address) return setMessage('❌ Connect wallet');
    if (!generatedImage) return setMessage('❌ Generate image first');
    setMessage('📝 Uploading to IPFS...');
    try {
      const uploadRes = await fetch('/api/create-signed-mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          imageUrl: generatedImage,
          username: profile?.username,
          fid: profile?.fid,
        }),
      });
      const uploadData = await uploadRes.json();
      if (uploadData.error) throw new Error(uploadData.error);
      const { metadataUri } = uploadData;
      setMessage('🔐 Confirm in wallet...');
      const data = encodeFunctionData({
        abi: MINT_ABI,
        functionName: 'mint',
        args: [metadataUri],
      });
      sendTransaction({
        to: CONTRACT_ADDRESS,
        data,
        value: parseEther('0.0001'),
        gas: 300000n,
      });
    } catch (e: any) {
      setMessage(`❌ ${e?.message || 'Failed'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white p-6">
      <div className="max-w-3xl mx-auto bg-slate-800/40 rounded-2xl p-6 shadow-xl">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">Raccoon Pixel Art Mint</h1>
          {address ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-300">
                {profile?.username ? `@${profile.username}` : shortAddr}
              </span>
              <button
                onClick={() => disconnect()}
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
                disabled={isPending || isConfirming || !address || !generatedImage}
                className="px-4 py-3 bg-emerald-600 rounded-lg font-semibold disabled:opacity-50"
              >
                {isPending || isConfirming ? 'Minting…' : 'Mint 0.0001 ETH'}
              </button>
            </div>
            {message && <div className="mt-3 text-sm text-amber-200">{message}</div>}
          </section>
          <aside className="space-y-4">
            <div className="bg-slate-900/30 p-4 rounded-lg text-center">
              <img
                src={profile?.pfp_url || "/default-pfp.png"}
                alt="pfp"
                className="w-24 h-24 rounded-full mx-auto mb-2"
              />
              <h3 className="font-bold">{profile?.display_name || profile?.username || 'Profile'}</h3>
              <div className="text-sm text-slate-300">
                @{profile?.username || 'unknown'}
              </div>
            </div>
          </aside>
        </main>
        <footer className="mt-4 text-xs text-slate-500 text-center">
          Built on Farcaster + Viem + wagmi
        </footer>
      </div>
    </div>
  );
}
