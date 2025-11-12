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
  const [generatedImage, setGeneratedImage] = useState<any>(null);
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

  const generateRaccoon = async () => {
    setLoading(true);
    setMessage('🎨 Generating personalized Goblin...');
    try {
      const res = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          style: 'pixel raccoon',
          fid: profile?.fid  // ✅ Send FID for consistent personalization
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto', background: '#1e293b', borderRadius: '16px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <h1 style={{ textAlign: 'center', color: '#fff', marginBottom: '24px', fontSize: '28px' }}>
          🦝 Goblin Mint
        </h1>

        {/* User Profile Section */}
        {profile && (
          <div style={{ 
            background: '#334155', 
            borderRadius: '12px', 
            padding: '16px', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {profile.pfp_url && (
              <img 
                src={profile.pfp_url} 
                alt="Profile" 
                style={{ 
                  width: '50px', 
                  height: '50px', 
                  borderRadius: '50%',
                  border: '2px solid #10b981'
                }} 
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: '600', fontSize: '16px' }}>
                @{profile.username || 'User'}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '2px' }}>
                FID: {profile.fid}
              </div>
            </div>
          </div>
        )}

        <div style={{ background: '#334155', borderRadius: '12px', padding: '16px', marginBottom: '20px', minHeight: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {generatedImage ? (
            <img src={generatedImage} alt="Generated" style={{ maxWidth: '100%', borderRadius: '8px' }} />
          ) : (
            <p style={{ color: '#94a3b8', textAlign: 'center' }}>No image generated</p>
          )}
        </div>

        <button
          onClick={generateRaccoon}
          disabled={loading}
          style={{ width: '100%', padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}
        >
          {loading ? '⏳ Generating...' : '🎨 Generate Goblin'}
        </button>

        <button
          onClick={performMint}
          disabled={!generatedImage || isPending || isConfirming}
          style={{ width: '100%', padding: '14px', background: !generatedImage ? '#475569' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: generatedImage ? 'pointer' : 'not-allowed', opacity: !generatedImage ? 0.5 : 1 }}
        >
          {isPending || isConfirming ? '⏳ Minting...' : '💰 Mint (0.0001 ETH)'}
        </button>

        {message && (
          <div style={{ marginTop: '16px', padding: '12px', background: '#1e293b', borderRadius: '8px', color: '#cbd5e1', textAlign: 'center', fontSize: '14px', border: '1px solid #334155' }}>
            {message}
          </div>
        )}

        {txHash && (
          <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
            TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </div>
        )}
      </div>
    </div>
  );
}
