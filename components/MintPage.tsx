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

// 🔥 YOUR HOSTED STYLE REFERENCE NFT (REPLACE THIS URL!)
const STYLE_REFERENCE_URL = 'https://up6.cc/2025/10/176316542260411.png';

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
        const username = context?.user?.username;
        const pfpUrl = context?.user?.pfpUrl;

        if (fid) {
          setProfile({
            display_name: username || '',
            username: username || '',
            pfp_url: pfpUrl || null,
            fid,
          });
        }
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

  // 🔥 UPDATED: Sends BOTH user PFP and style reference together
  const generateRaccoon = async () => {
    setLoading(true);
    setMessage('🎨 Transforming you into a premium NFT...');
    
    try {
      const res = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPfpUrl: profile?.pfp_url,        // ✅ User's Farcaster PFP
        }),
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
      console.log('✅ Metadata URI:', metadataUri);
      
      setMessage('🔐 Confirm in wallet...');
      
      const data = encodeFunctionData({
        abi: MINT_ABI,
        functionName: 'mint',
        args: [metadataUri],
      });

      console.log('✅ Encoded data:', data);
      
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white p-6">
      <h1 className="text-4xl font-bold text-center mb-8">🦝 Goblin Mint</h1>

      {/* User Profile Section */}
      {profile && (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
          {profile.pfp_url && (
            <img
              src={profile.pfp_url}
              alt="Profile"
              className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-purple-500"
            />
          )}
          <p className="text-center font-semibold">@{profile.username || 'User'}</p>
          <p className="text-center text-sm opacity-70">FID: {profile.fid}</p>
        </div>
      )}

      {/* Generated Image Section */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
        {generatedImage ? (
          <img
            src={generatedImage}
            alt="Generated"
            className="w-full max-w-md mx-auto rounded-xl border-4 border-purple-500"
          />
        ) : (
          <div className="w-full h-64 bg-gray-800/50 rounded-xl flex items-center justify-center">
            <p className="text-gray-400">No image generated</p>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={generateRaccoon}
        disabled={loading || !profile?.pfp_url}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl mb-4 transition-all shadow-lg"
      >
        {loading ? '⏳ Generating...' : '🎨 Generate NFT'}
      </button>

      {/* Mint Button */}
      <button
        onClick={performMint}
        disabled={!generatedImage || isPending || isConfirming || !isConnected}
        className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl mb-4 transition-all shadow-lg"
      >
        {isPending || isConfirming ? '⏳ Minting...' : '💰 Mint (0.0001 ETH)'}
      </button>

      {/* Status Message */}
      {message && (
        <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-4 text-center">
          {message}
        </div>
      )}

      {/* Transaction Hash */}
      {txHash && (
        <div className="mt-4 text-center text-sm opacity-70">
          TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
        </div>
      )}
    </div>
  );
}
