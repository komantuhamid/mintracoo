'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { parseAbi, encodeFunctionData, parseEther } from 'viem';
import sdk from '@farcaster/miniapp-sdk';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from 'wagmi';

// ✅ CONTRACT ADDRESS & ABI
const CONTRACT_ADDRESS = '0x1c60072233E9AdE9312d35F36a130300288c27F0' as `0x${string}`;
const MINT_ABI = parseAbi(['function mint(string memory tokenURI_) payable']);
const STYLE_REFERENCE_URL = 'https://up6.cc/2025/10/176316542260411.png';

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendTransaction, isPending, data: txHash } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // PROFILE/STATE VARS ⚡
  const [profile, setProfile] = useState<any>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // LOAD PROFILE FROM FARCASTER MINIAPP SDK
  useEffect(() => {
    sdk?.getUserInfo().then((res: any) => setProfile(res?.user));
  }, []);

  // 🚀 GENERATE NFT IMAGE
  const generateRaccoon = async () => {
    setLoading(true);
    setMessage('🎨 Transforming you into a premium NFT...');
    try {
      const res = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pfpUrl: profile?.pfp_url, // <--- ⚡ FIXED: correct key for backend
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

  // MINT ONCHAIN
  const mint = async () => {
    if (!generatedImage) {
      setMessage('Generate an NFT image first!');
      return;
    }
    const tokenUri = generatedImage;
    const data = encodeFunctionData({
      abi: MINT_ABI,
      functionName: 'mint',
      args: [tokenUri],
    });
    sendTransaction({
      to: CONTRACT_ADDRESS,
      data,
      value: parseEther('0.0001'),
    });
  };

  // JSX RENDER
  return (
    <div style={{ padding: 24, maxWidth: 420, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <img
          src={profile?.pfp_url}
          alt={profile?.username}
          style={{ width: 86, height: 86, borderRadius: '50%', border: '4px solid #a15cff', margin: '0 auto 10px' }}
        />
        <div>
          <strong>@{profile?.username}</strong>
          <div style={{ fontSize: 12, opacity: 0.8 }}>FID: {profile?.fid}</div>
        </div>
      </div>

      <div className="image-preview-container" style={{ margin: '24px 0', padding: 18, borderRadius: 22, background: 'linear-gradient(135deg, #492b7cbb 0%, #200368ba 100%)' }}>
        {generatedImage ? (
          <img src={generatedImage} alt="Generated NFT" style={{ maxWidth: '100%', borderRadius: 16 }} />
        ) : (
          <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>No image generated</div>
        )}
      </div>

      <button
        disabled={loading}
        style={{
          width: '100%',
          background: 'linear-gradient(90deg, #ff42b2, #b24fff)',
          color: '#fff',
          padding: '15px 0',
          border: 'none',
          borderRadius: 10,
          fontWeight: 600,
          marginBottom: 12,
          fontSize: 18,
        }}
        onClick={generateRaccoon}
      >
        🎨 Generate NFT
      </button>
      <button
        disabled={!generatedImage || isPending}
        style={{
          width: '100%',
          background: !generatedImage ? '#282a35' : 'linear-gradient(90deg, #ffe579, #ffd02c)',
          color: '#140223',
          padding: '15px 0',
          border: 'none',
          borderRadius: 10,
          fontWeight: 600,
          marginBottom: 12,
          fontSize: 18,
          opacity: !generatedImage ? 0.5 : 1,
        }}
        onClick={mint}
      >
        💰 Mint (0.0001 ETH)
      </button>
      <div style={{ marginTop: 6, color: '#b24fff' }}>
        {message && <div>{message}</div>}
      </div>
    </div>
  );
}
