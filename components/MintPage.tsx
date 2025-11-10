'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { encodeFunctionData, parseEther } from 'viem';
import sdk from '@farcaster/miniapp-sdk';
import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';

const CONTRACT_ADDRESS = '0xD1b64081848FF10000D79D1268bA04536DDF6DbC' as `0x${string}`;
const MINT_PRICE = '0.0001';

// ABI for mintWithSignature function
const MINT_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'to', type: 'address' },
          { name: 'royaltyRecipient', type: 'address' },
          { name: 'royaltyBps', type: 'uint256' },
          { name: 'primarySaleRecipient', type: 'address' },
          { name: 'uri', type: 'string' },
          { name: 'price', type: 'uint256' },
          { name: 'currency', type: 'address' },
          { name: 'validityStartTimestamp', type: 'uint128' },
          { name: 'validityEndTimestamp', type: 'uint128' },
          { name: 'uid', type: 'bytes32' },
        ],
        name: '_req',
        type: 'tuple',
      },
      { name: '_signature', type: 'bytes' },
    ],
    name: 'mintWithSignature',
    outputs: [{ name: 'tokenIdMinted', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // useSendTransaction hook
  const { sendTransaction, isPending: isSending, data: txHash } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [profile, setProfile] = useState<any>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);

  const shortAddr = useMemo(() => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''), [address]);

  // Initialize app
  useEffect(() => {
    (async () => {
      try {
        await sdk.actions.ready();
        setIsAppReady(true);
      } catch (e) {
        console.error('SDK not ready:', e);
        setIsAppReady(true);
      }
    })();
  }, []);

  // Auto-connect user
  useEffect(() => {
    if (!isAppReady || isConnected) return;

    (async () => {
      try {
        const context = await sdk.context;
        if (context?.user && connectors[0]) {
          await connect({ connector: connectors[0] });
        }
      } catch (e) {
        console.error('Auto-connect error:', e);
      }
    })();
  }, [isAppReady, isConnected, connectors, connect]);

  // Fetch user profile
  useEffect(() => {
    (async () => {
      try {
        const context = await sdk.context;
        if (!context?.user?.fid) return;

        const r = await fetch('/api/fetch-pfp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid: context.user.fid }),
        });

        const j = await r.json();
        setProfile({
          username: j.username || '',
          fid: context.user.fid,
        });
      } catch (e) {
        console.error('Profile fetch error:', e);
      }
    })();
  }, []);

  // Watch for transaction confirmation
  useEffect(() => {
    if (isSending) {
      setMessage('⏳ Pending...');
    } else if (isConfirming) {
      setMessage('⏳ Confirming...');
    } else if (isConfirmed) {
      setMessage('🎉 Minted successfully!');
      setGeneratedImage(null);
    }
  }, [isSending, isConfirming, isConfirmed]);

  const generateRaccoon = async () => {
    setLoading(true);
    setMessage('🎨 Generating pixel art raccoon...');

    try {
      const r = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: 'pixel raccoon' }),
      });

      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Generation failed');

      setGeneratedImage(j.generated_image_url || j.imageUrl);
      setMessage('✅ Raccoon ready to mint!');
    } catch (e: any) {
      setMessage(`❌ Generation failed: ${e?.message}`);
    } finally {
      setLoading(false);
    }
  };

const performMint = async () => {
  if (!address) {
    setMessage('❌ Please connect wallet');
    return;
  }
  if (!generatedImage) {
    setMessage('❌ Please generate raccoon first');
    return;
  }

  setMessage('📝 Creating mint signature...');

  try {
    console.log('📤 Sending request to backend...');
    const sigRes = await fetch('/api/create-mint-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address,
        imageUrl: generatedImage,
        username: profile?.username,
        fid: profile?.fid,
      }),
    });

    console.log('📥 Response status:', sigRes.status);

    // Check if response is OK first
    if (!sigRes.ok) {
      console.log('❌ Response not OK:', sigRes.status, sigRes.statusText);
      const errorData = await sigRes.json().catch(() => ({ error: 'Unknown error' }));
      console.log('Error data:', errorData);
      throw new Error(errorData?.error || `Backend error: ${sigRes.statusText}`);
    }

    // Try to parse JSON
    let sigData;
    try {
      sigData = await sigRes.json();
      console.log('✅ Response parsed:', sigData);
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError);
      throw new Error('Backend returned invalid JSON - check Vercel logs');
    }

    // Check for errors in the response
    if (sigData.error) {
      console.error('Backend error:', sigData);
      throw new Error(sigData.error);
    }

    const { payload, signature } = sigData;
    console.log('✅ Got payload and signature');

    if (!payload || !signature) {
      throw new Error('Missing payload or signature in response');
    }

    // Step 2: Encode and send transaction
    setMessage('🔐 Please sign transaction in wallet...');

    const data = encodeFunctionData({
      abi: MINT_ABI,
      functionName: 'mintWithSignature',
      args: [payload, signature as `0x${string}`],
    });

    console.log('📤 Sending transaction...');

    // Send transaction - this shows wallet popup!
    sendTransaction({
      to: CONTRACT_ADDRESS,
      data,
      value: parseEther(MINT_PRICE),
      gas: 500000n,
    });
  } catch (e: any) {
    console.error('❌ Error:', e);
    const errorMsg = e?.message || 'Mint failed';
    setMessage(`❌ ${errorMsg}`);
  }
};


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
        {/* Title */}
        <h1 className="text-4xl font-bold text-white mb-2 text-center">🦝 Raccoon</h1>
        <p className="text-center text-slate-400 mb-6">AI Pixel Art NFT Mint</p>

        {/* Price Info */}
        <div className="mb-4 p-3 bg-purple-900/30 rounded-lg border border-purple-500">
          <p className="text-purple-300 text-sm text-center font-semibold">
            💰 Price: <strong>{MINT_PRICE} ETH</strong> • 📊 Supply: <strong>3333</strong>
          </p>
        </div>

        {/* Image Preview */}
        <div className="mb-6 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg p-4 min-h-64 flex items-center justify-center border-2 border-slate-600 shadow-inner">
          {generatedImage ? (
            <img src={generatedImage} alt="Raccoon NFT" className="w-full h-auto rounded-lg shadow-lg" />
          ) : (
            <div className="text-center">
              <p className="text-slate-400 text-lg">🎨</p>
              <p className="text-slate-400 text-sm">Generate your raccoon</p>
            </div>
          )}
        </div>

        {/* User Info */}
        {profile?.username && (
          <div className="mb-4 p-3 bg-slate-700 rounded-lg border border-slate-600">
            <p className="text-slate-300 text-sm">
              <strong>Creator:</strong> @{profile.username}
            </p>
          </div>
        )}

        {/* Wallet Info */}
        <div className="mb-4 p-3 bg-slate-700 rounded-lg border border-slate-600">
          <p className="text-slate-300 text-sm">
            <strong>Wallet:</strong> {shortAddr || 'Connecting...'}
          </p>
          {isConnected && (
            <button
              onClick={() => disconnect()}
              className="mt-2 w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Buttons */}
        <div className="space-y-3 mb-4">
          <button
            onClick={generateRaccoon}
            disabled={loading || isSending || isConfirming}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-bold transition transform hover:scale-105 disabled:scale-100"
          >
            {loading ? '⏳ Generating...' : '🎨 Generate Raccoon'}
          </button>

          <button
            onClick={performMint}
            disabled={isSending || isConfirming || !address || !generatedImage}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-bold transition transform hover:scale-105 disabled:scale-100"
          >
            {isSending || isConfirming ? '⏳ Minting...' : `💰 Mint (${MINT_PRICE} ETH)`}
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div className="p-4 bg-slate-700 rounded-lg border border-slate-600 text-slate-200 text-sm text-center">
            {message}
          </div>
        )}

        {/* Transaction Link */}
        {txHash && (
          <div className="mt-4">
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-center rounded-lg font-bold transition"
            >
              🔗 View on Basescan
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

