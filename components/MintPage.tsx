'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { parseAbi, encodeFunctionData } from 'viem';
import sdk from '@farcaster/miniapp-sdk';
import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';

// ✅ YOUR EXACT CONTRACT ADDRESS
const CONTRACT_ADDRESS = '0xD1b64081848FF10000D79D1268bA04536DDF6DbC' as `0x${string}`;

// ✅ YOUR EXACT ABI (from Basescan)
const MINT_ABI = parseAbi([
  'function mintTo(address _to, string _uri) returns (uint256)',
]);

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendTransaction, isPending, data: txHash } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

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

  useEffect(() => {
    if (isPending) {
      setMessage('⏳ Confirm in wallet...');
    } else if (txHash) {
      setMessage(`✅ Sent! ${txHash.slice(0, 10)}...`);
    } else if (isConfirming) {
      setMessage('⏳ Confirming...');
    } else if (isConfirmed) {
      setMessage('🎉 NFT Minted Successfully!');
    }
  }, [isPending, txHash, isConfirming, isConfirmed]);

  const generateRaccoon = async () => {
    setLoading(true);
    setMessage('Generating...');
    try {
      const res = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: 'pixel raccoon' }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Failed');

      setGeneratedImage(j.generated_image_url || j.imageUrl);
      setMessage('Ready to mint!');
    } catch (e: any) {
      setMessage(`❌ ${e?.message}`);
    } finally {
      setLoading(false);
    }
  };

  const performMint = async () => {
    if (!address) return setMessage('Connect wallet');
    if (!generatedImage) return setMessage('Generate image first');

    setMessage('Uploading to IPFS...');

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

      console.log('Minting to:', address);
      console.log('Metadata URI:', metadataUri);

      // ✅ Encode function call
      const data = encodeFunctionData({
        abi: MINT_ABI,
        functionName: 'mintTo',
        args: [address, metadataUri],
      });

      console.log('Encoded data:', data);

      // ✅ Send transaction (NO VALUE - contract is nonpayable)
      sendTransaction({
        to: CONTRACT_ADDRESS,
        data,
      });

    } catch (e: any) {
      console.error('Mint error:', e);
      setMessage(`❌ ${e?.message || 'Failed'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          🎨 Raccoon Mint
        </h1>

        <div className="mb-6 bg-slate-700 rounded-lg p-4 min-h-64 flex items-center justify-center">
          {generatedImage ? (
            <img src={generatedImage} alt="Raccoon" className="w-full rounded" />
          ) : (
            <span className="text-slate-400">No image</span>
          )}
        </div>

        {profile && (
          <div className="mb-4 p-3 bg-slate-700 rounded">
            <p className="text-slate-300 text-sm">
              <strong>User:</strong> {profile.username}
            </p>
          </div>
        )}

        <div className="mb-4 p-3 bg-slate-700 rounded">
          <p className="text-slate-300 text-sm">
            <strong>Wallet:</strong> {shortAddr || 'Connecting...'}
          </p>
          {isConnected && (
            <button
              onClick={() => disconnect()}
              className="mt-2 w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
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
            {loading ? 'Generating...' : '🎨 Generate'}
          </button>

          <button
            onClick={performMint}
            disabled={isPending || isConfirming || !address || !generatedImage}
            className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded font-semibold"
          >
            {isPending || isConfirming ? 'Minting...' : '🎯 Mint FREE'}
          </button>
        </div>

        {message && (
          <div className="p-3 bg-slate-700 rounded text-slate-200 text-sm">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

