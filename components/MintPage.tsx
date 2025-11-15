'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { parseAbi, encodeFunctionData, parseEther } from 'viem';
import sdk from '@farcaster/miniapp-sdk';
import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';

const CONTRACT_ADDRESS = '0x1c60072233E9AdE9312d35F36a130300288c27F0' as `0x${string}`;
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
  const [nsfwError, setNsfwError] = useState(false);

  const shortAddr = useMemo(
    () => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''),
    [address]
  );

  useEffect(() => {
    const init = async () => {
      try { await sdk.actions.ready(); setIsAppReady(true); }
      catch (e) { setIsAppReady(true); }
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
      } catch {}
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
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    if (isPending) setMessage('⏳ Confirm in wallet...');
    else if (isConfirming) setMessage('⏳ Confirming...');
    else if (isConfirmed) setMessage('🎉 NFT Minted Successfully!');
  }, [isPending, isConfirming, isConfirmed]);

  const generateRaccoon = async () => {
    setLoading(true);
    setNsfwError(false);
    setMessage('🎨 Generating personalized Goblin...');
    try {
      const res = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: 'pixel raccoon',
          pfpUrl: profile?.pfp_url
        }),
      });
      const j = await res.json();
      // --- Handle NSFW filter error here ---
      if (j?.error && j.error.toLowerCase().includes('nsfw')) {
        setNsfwError(true);
        setMessage(null);
        setGeneratedImage(null);
        return;
      }
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #232526 0%, #757F9A 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div style={{
        background: '#fff7de',
        padding: 40,
        borderRadius: 22,
        boxShadow: '0 4px 40px #0002',
        maxWidth: 380,
        width: '100%',
        textAlign: 'center'
      }}>
        <h2 style={{
          marginBottom: 16,
          fontSize: 28,
          letterSpacing: 1,
          color: '#543000'
        }}>🦝 Goblin Mint</h2>

        {/* Profile */}
        {profile && (
          <div style={{ marginBottom: 24 }}>
            {profile.pfp_url && <img src={profile.pfp_url} alt="pfp"
              style={{ width: 86, borderRadius: 18, margin: '0 auto 10px', boxShadow: '0 2px 12px #0001' }} />}
            <div style={{ fontWeight: 600, fontSize: 15, color: '#5e441c' }}>
              @{profile.username || 'User'}
            </div>
            <div style={{ fontSize: 13, opacity: .6 }}>FID: {profile.fid}</div>
          </div>
        )}

        {/* Generated Image */}
        <div style={{ margin: '24px 0', minHeight: 180 }}>
          {generatedImage
            ? <img src={generatedImage} alt="nft"
                style={{ maxWidth: 270, borderRadius: 17, boxShadow: '0 2px 20px #0002' }} />
            : <div style={{ color: '#aeaeae', fontSize: 18 }}>No image generated</div>
          }
        </div>

        {/* Generate Button */}
        {nsfwError ? (
          <div>
            <div style={{ color: '#c01414', marginBottom: 6, fontWeight: 600 }}>
              🟠 Image blocked by content filter.
            </div>
            <button
              style={{
                background: 'linear-gradient(90deg,#ff9800,#fdbb2d)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                padding: '12px 28px',
                borderRadius: 18,
                cursor: 'pointer',
                fontSize: 15,
                boxShadow: '0 1px 10px #ffbb0030',
                marginBottom: 10
              }}
              disabled={loading}
              onClick={generateRaccoon}
            >Try Again</button>
          </div>
        ) : (
          <button
            style={{
              background: 'linear-gradient(90deg,#60a76e,#59c99b)',
              border: 'none',
              color: '#fff',
              fontWeight: 700,
              padding: '12px 28px',
              borderRadius: 18,
              cursor: 'pointer',
              fontSize: 15,
              boxShadow: '0 2px 10px #16994030',
              marginBottom: 10,
              transition: 'background 0.2s'
            }}
            disabled={loading}
            onClick={generateRaccoon}
          >
            {loading ? '⏳ Generating...' : '🎨 Generate Goblin'}
          </button>
        )}

        {/* Mint Button */}
        <button
          style={{
            background: 'linear-gradient(90deg,#1880fa,#3992fa)',
            border: 'none',
            color: '#fff',
            fontWeight: 700,
            padding: '12px 28px',
            borderRadius: 18,
            cursor: 'pointer',
            fontSize: 15,
            boxShadow: '0 2px 10px #07408024',
            marginLeft: 7,
            marginRight: 7
          }}
          disabled={isPending || isConfirming}
          onClick={performMint}
        >
          {isPending || isConfirming ? '⏳ Minting...' : '💰 Mint (0.0001 ETH)'}
        </button>

        {/* Message */}
        {message && (
          <div style={{ marginTop: 18, color: '#745e30', fontWeight: 500, fontSize: 16 }}>
            {message}
          </div>
        )}
        {/* TX hash */}
        {txHash && (
          <div style={{ marginTop: 11, color: '#143664', fontSize: 13 }}>
            TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </div>
        )}
      </div>
    </div>
  );
}
