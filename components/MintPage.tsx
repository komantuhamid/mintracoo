'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { parseAbi, encodeFunctionData, parseEther } from 'viem';
import sdk from '@farcaster/miniapp-sdk';
import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';

const CONTRACT_ADDRESS = '0xD1b64081848FF10000D79D1268bA04536DDF6DbC' as `0x${string}`;
const MINT_PRICE = '0.0001';

// ✅ mintWithSignature ABI
const MINT_WITH_SIG_ABI = parseAbi([
  'function mintWithSignature((address to, address royaltyRecipient, uint256 royaltyBps, address primarySaleRecipient, string uri, uint256 price, address currency, uint128 validityStartTimestamp, uint128 validityEndTimestamp, bytes32 uid) _req, bytes _signature) payable returns (uint256)',
]);

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

  const shortAddr = useMemo(() => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''), [address]);

  useEffect(() => {
    sdk.actions.ready().then(() => setIsAppReady(true)).catch(() => setIsAppReady(true));
  }, []);

  useEffect(() => {
    if (!isAppReady || isConnected) return;
    (async () => {
      try {
        const context = await sdk.context;
        if (context?.user && connectors[0]) await connect({ connector: connectors[0] });
      } catch (e) {}
    })();
  }, [isAppReady, isConnected, connectors, connect]);

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
        setProfile({ username: j.username || '', fid: context.user.fid });
      } catch (e) {}
    })();
  }, []);

  const generateRaccoon = async () => {
    setLoading(true);
    setMessage('🎨 Generating...');
    try {
      const r = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: 'pixel raccoon' }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed');
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
    if (!generatedImage) return setMessage('❌ Generate first');

    setMessage('📝 Creating signature...');

    try {
      // Get signature from backend
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

      const sigData = await sigRes.json();
      if (!sigRes.ok || sigData.error) {
        throw new Error(sigData.error || 'Signature failed');
      }

      const { payload, signature } = sigData;

      console.log('✅ Payload:', payload);
      console.log('✅ Signature:', signature);

      // Encode transaction
      const data = encodeFunctionData({
        abi: MINT_WITH_SIG_ABI,
        functionName: 'mintWithSignature',
        args: [payload, signature as `0x${string}`],
      });

      setMessage(`🔐 Sign (${MINT_PRICE} ETH)...`);

      // Send transaction with payment
      sendTransaction({
        to: CONTRACT_ADDRESS,
        data,
        value: parseEther(MINT_PRICE), // ✅ User pays 0.0001 ETH
        gas: 500000n,
      });
    } catch (e: any) {
      console.error('❌ Error:', e);
      setMessage(`❌ ${e?.message || 'Failed'}`);
    }
  };

  useEffect(() => {
    if (isPending) {
      setMessage('⏳ Pending...');
    } else if (isConfirming) {
      setMessage('⏳ Confirming...');
    } else if (isConfirmed) {
      setMessage('🎉 Minted!');
    }
  }, [isPending, isConfirming, isConfirmed]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">🦝 Raccoon Mint</h1>
        
        <div className="mb-4 p-3 bg-purple-900/30 rounded border border-purple-500">
          <p className="text-purple-300 text-sm text-center">
            <strong>Price:</strong> {MINT_PRICE} ETH • <strong>Supply:</strong> 3333
          </p>
        </div>

        <div className="mb-6 bg-slate-700 rounded-lg p-4 min-h-64 flex items-center justify-center border-2 border-slate-600">
          {generatedImage ? (
            <img src={generatedImage} alt="Raccoon" className="w-full h-auto rounded" />
          ) : (
            <span className="text-slate-400 text-sm">No image</span>
          )}
        </div>

        {profile && (
          <div className="mb-4 p-3 bg-slate-700 rounded border border-slate-600">
            <p className="text-slate-300 text-sm"><strong>User:</strong> {profile.username}</p>
          </div>
        )}

        <div className="mb-4 p-3 bg-slate-700 rounded border border-slate-600">
          <p className="text-slate-300 text-sm"><strong>Wallet:</strong> {shortAddr || 'Connecting...'}</p>
          {isConnected && (
            <button onClick={() => disconnect()} className="mt-2 w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm">
              Disconnect
            </button>
          )}
        </div>

        <div className="space-y-3 mb-4">
          <button onClick={generateRaccoon} disabled={loading} className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded font-semibold">
            {loading ? '⏳ Generating...' : '🎨 Generate'}
          </button>

          <button onClick={performMint} disabled={isPending || isConfirming || !address || !generatedImage} className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded font-semibold">
            {isPending || isConfirming ? '⏳ Minting...' : `💰 Mint (${MINT_PRICE} ETH)`}
          </button>
        </div>

        {message && (
          <div className="p-3 bg-slate-700 rounded border border-slate-600 text-slate-200 text-sm text-center">
            {message}
          </div>
        )}

        {txHash && (
          <div className="mt-4">
            <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded font-semibold text-sm">
              🔗 View TX
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
