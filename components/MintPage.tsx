'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { parseAbi, encodeFunctionData, parseEther } from 'viem';
import sdk from '@farcaster/miniapp-sdk';
import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';

// ✅ YOUR CONTRACT ADDRESS
const CONTRACT_ADDRESS = '0x1c60072233E9AdE9312d35F36a130300288c27F0' as `0x${string}`;

// ✅ CORRECT ABI FOR YOUR NEW CONTRACT
const MINT_ABI = parseAbi([
  'function mint(string memory tokenURI_) payable',
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
    } else if (isConfirming) {
      setMessage('⏳ Confirming...');
    } else if (isConfirmed) {
      setMessage('🎉 NFT Minted Successfully!');
    }
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
      // 1. Upload metadata to IPFS
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
      console.log('✅ Metadata URI:', metadataUri);

      setMessage('🔐 Confirm in wallet...');

      // 2. Encode mint(string) call - CORRECT!
      const data = encodeFunctionData({
        abi: MINT_ABI,
        functionName: 'mint',
        args: [metadataUri], // ← Only metadataUri, no address!
      });

      console.log('✅ Encoded data:', data);

      // 3. Send transaction with payment
      sendTransaction({
        to: CONTRACT_ADDRESS,
        data,
        value: parseEther('0.0001'),
        gas: 300000n,
      });

    } catch (e: any) {
      console.error('❌ Mint error:', e);
      setMessage(`❌ ${e?.message || 'Failed'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 p-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-6">
        <h1 className="text-3xl font-bold text-white mb-4 text-center">
          🦝 Raccoon Mint
        </h1>

        <div className="mb-4 bg-gray-700 rounded-lg p-4 min-h-64 flex items-center justify-center">
          {generatedImage ? (
            <img src={generatedImage} alt="Raccoon" className="w-full rounded-lg" />
          ) : (
            <p className="text-gray-400">No image generated</p>
          )}
        </div>

        {profile && (
          <p className="text-gray-300 text-sm mb-2">
            👤 {profile.username || 'User'}
          </p>
        )}

        <p className="text-gray-300 text-sm mb-4">
          💼 {shortAddr || 'Not connected'}
        </p>

        <button
          onClick={generateRaccoon}
          disabled={loading || isPending || isConfirming}
          className="w-full mt-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition"
        >
          {loading ? '⏳ Generating...' : '🎨 Generate Raccoon'}
        </button>

        <button
          onClick={performMint}
          disabled={!address || !generatedImage || isPending || isConfirming}
          className="w-full mt-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition"
        >
          {isPending || isConfirming ? '⏳ Minting...' : '💰 Mint (0.0001 ETH)'}
        </button>

        {message && (
          <div className="mt-4 p-3 bg-gray-700 rounded text-gray-200 text-sm text-center">
            {message}
          </div>
        )}

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

        {txHash && (
          <div className="mt-2 p-2 bg-gray-700 rounded text-xs text-gray-300 break-all">
            TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </div>
        )}
      </div>
    </div>
  );
}
