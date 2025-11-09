'use client';

import React, { useEffect, useMemo, useState } from 'react';
import sdk from '@farcaster/miniapp-sdk';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [profile, setProfile] = useState<any>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);

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
    const autoConnect = async () => {
      if (!isAppReady || isConnected) return;
      try {
        const context = await sdk.context;
        if (context?.user && connectors.length > 0) {
          await connect({ connector: connectors[0] });
        }
      } catch (e) {
        console.log('Auto-connect error:', e);
      }
    };
    autoConnect();
  }, [isAppReady, isConnected, connectors, connect]);

  useEffect(() => {
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
          display_name: j.display_name || '',
          username: j.username || '',
          pfp_url: j.pfp_url || null,
          fid,
        });
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const generateRaccoon = async () => {
    setLoading(true);
    setMessage('Generating...');
    setMintedTokenId(null);
    
    try {
      const res = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: 'pixel raccoon collectible nft' }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Failed');

      setGeneratedImage(j.generated_image_url || j.imageUrl);
      setMessage('✅ Ready to mint!');
    } catch (e: any) {
      setMessage(`❌ ${e?.message || 'Failed'}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ BACKEND MINTING (Public - no permissions needed!)
  const performMint = async () => {
    if (!address) return setMessage('❌ Connect wallet first');
    if (!generatedImage) return setMessage('❌ Generate image first');

    setMinting(true);
    setMessage('🎨 Uploading to IPFS & Minting...');

    try {
      const res = await fetch('/api/create-signed-mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          imageUrl: generatedImage,
          username: profile?.username,
          fid: profile?.fid,
        }),
      });

      const data = await res.json();
      
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Mint failed');
      }

      setMintedTokenId(data.tokenId);
      setMessage(`🎉 Minted! Token #${data.tokenId}`);
      
      console.log('✅ Success:', data);
    } catch (e: any) {
      console.error('Mint error:', e);
      setMessage(`❌ ${e?.message || 'Minting failed'}`);
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          🦝 Raccoon Mint
        </h1>

        <div className="mb-6 bg-slate-700 rounded-lg p-4 min-h-64 flex items-center justify-center border-2 border-slate-600">
          {generatedImage ? (
            <img src={generatedImage} alt="Raccoon" className="w-full h-auto rounded" />
          ) : (
            <span className="text-slate-400 text-sm">No image yet</span>
          )}
        </div>

        {profile && (
          <div className="mb-4 p-3 bg-slate-700 rounded border border-slate-600">
            <p className="text-slate-300 text-sm">
              <strong>User:</strong> {profile.username}
            </p>
          </div>
        )}

        <div className="mb-4 p-3 bg-slate-700 rounded border border-slate-600">
          <p className="text-slate-300 text-sm">
            <strong>Wallet:</strong> {shortAddr || 'Connecting...'}
          </p>
          {isConnected && (
            <button
              onClick={() => disconnect()}
              className="mt-2 w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold"
            >
              Disconnect
            </button>
          )}
        </div>

        <div className="space-y-3 mb-4">
          <button
            onClick={generateRaccoon}
            disabled={loading}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded font-semibold"
          >
            {loading ? '⏳ Generating...' : '🎨 Generate'}
          </button>

          <button
            onClick={performMint}
            disabled={minting || !address || !generatedImage}
            className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded font-semibold"
          >
            {minting ? '⏳ Minting...' : '🎯 Mint FREE'}
          </button>
        </div>

        {message && (
          <div className="p-3 bg-slate-700 rounded border border-slate-600 text-slate-200 text-sm">
            {message}
          </div>
        )}

        {mintedTokenId && (
          <div className="mt-4">
            <a
              href={`https://thirdweb.com/base/0xD1b64081848FF10000D79D1268bA04536DDF6DbC/nfts/${mintedTokenId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded font-semibold"
            >
              🔗 View NFT
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
