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

// ✅ YOUR CONTRACT ADDRESS
const CONTRACT_ADDRESS = '0x1c60072233E9AdE9312d35F36a130300288c27F0' as `0x${string}`;

// ✅ CORRECT ABI FOR YOUR NEW CONTRACT
const MINT_ABI = parseAbi(['function mint(string memory tokenURI_) payable']);

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendTransaction, isPending, data: txHash } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [profile, setProfile] = useState<any>(null);

  // generated image can come from server as final_image_data_url (preferred) or merged_preview
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [mergedPreview, setMergedPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);

  const shortAddr = useMemo(() => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''), [address]);

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

  /**
   * Generate image:
   * - POST to /api/generate-art with pfpUrl (and optional styleUrl in body)
   * - server returns final_image_data_url (best) or merged_preview fallback
   */
  const generateRaccoon = async () => {
    setLoading(true);
    setMessage('🎨 Generating personalized Goblin...');
    setGeneratedImage(null);
    setMergedPreview(null);

    try {
      // call server - we send pfpUrl; styleUrl is optional (server uses DEFAULT_STYLE_URL if missing)
      const res = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pfpUrl: profile?.pfp_url,
          // optional: styleUrl: 'https://your-style-reference.png'
          // you can customize prompt_strength, guidance_scale, etc here if needed
        }),
      });

      const j = await res.json();

      if (!res.ok) {
        // replicate may have returned structured error in j
        const errMsg = j?.error || (j?.replicate_output ? 'No final image produced by model (see replicate_output)' : 'Failed to generate');
        throw new Error(errMsg);
      }

      // prefer final_image_data_url
      const final = j?.final_image_data_url ?? j?.final_image ?? j?.generated_image_url ?? null;
      const merged = j?.merged_preview ?? null;

      if (final) {
        setGeneratedImage(final);
        setMessage('✅ Ready to mint!');
      } else if (merged) {
        // show merged preview and message that final is not ready
        setMergedPreview(merged);
        setMessage('⚠️ No final image produced by model. Showing merged preview — you can retry generation or mint merged preview.');
      } else {
        // sometimes replicate_output contains an URL deep inside
        const tryUrl =
          j?.replicate_output?.[0] ||
          j?.replicate_output?.output?.[0] ||
          (typeof j?.replicate_output === 'string' ? j?.replicate_output : null);

        if (tryUrl) {
          // attempt to convert to data URL by fetching
          try {
            const r = await fetch(tryUrl);
            if (r.ok) {
              const buf = Buffer.from(await r.arrayBuffer());
              const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
              setGeneratedImage(dataUrl);
              setMessage('✅ Ready to mint!');
            } else {
              setMessage('❌ Generation returned an image URL but failed to fetch it.');
            }
          } catch (e: any) {
            setMessage(`❌ Error fetching generated image: ${String(e?.message ?? e)}`);
          }
        } else {
          setMessage('❌ No image returned. Check server logs (replicate_output) for details.');
        }
      }
    } catch (e: any) {
      console.error('Generate error:', e);
      setMessage(`❌ ${e?.message ?? 'Failed to generate'}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Upload metadata & mint
   * Expects an API route /api/create-signed-mint returning { metadataUri }
   */
  const performMint = async () => {
    if (!address) return setMessage('❌ Connect wallet');
    const toMintImage = generatedImage ?? mergedPreview;
    if (!toMintImage) return setMessage('❌ Generate image first');

    setMessage('📝 Uploading to IPFS...');

    try {
      const uploadRes = await fetch('/api/create-signed-mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          imageUrl: toMintImage,
          username: profile?.username,
          fid: profile?.fid,
        }),
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || uploadData.error) throw new Error(uploadData.error || 'Upload failed');

      const { metadataUri } = uploadData;
      console.log('✅ Metadata URI:', metadataUri);
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
      console.error('❌ Mint error:', e);
      setMessage(`❌ ${e?.message || 'Failed'}`);
    }
  };

  // small helper: display best image (final > merged)
  const bestImageToShow = generatedImage ?? mergedPreview ?? null;

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
          {bestImageToShow ? (
            <img src={bestImageToShow} alt="Generated" style={{ maxWidth: '100%', borderRadius: '8px' }} />
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
          disabled={!bestImageToShow || isPending || isConfirming}
          style={{
            width: '100%',
            padding: '14px',
            background: !bestImageToShow ? '#475569' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: bestImageToShow ? 'pointer' : 'not-allowed',
            opacity: !bestImageToShow ? 0.5 : 1
          }}
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
            TX: {String(txHash).slice(0, 10)}...{String(txHash).slice(-8)}
          </div>
        )}
      </div>
    </div>
  );
}
