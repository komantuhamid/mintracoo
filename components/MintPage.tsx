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
    hash: txHash as any,
  });

  const [profile, setProfile] = useState<any>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null); // will hold data:image/... or null
  const [mergedPreview, setMergedPreview] = useState<string | null>(null); // instant preview from server
  const [replicateOutput, setReplicateOutput] = useState<any>(null); // debug info
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

  // helper: try to fetch a remote image URL and convert to data URL (browser-friendly)
  async function fetchUrlToDataUrl(url: string) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
      const blob = await r.blob();
      return await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = (e) => reject(e);
        fr.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('fetchUrlToDataUrl error', e);
      return null;
    }
  }

  // polling helper: if replicate_output contains a URL, try fetching it few times
  async function tryPollForImage(replOut: any, retries = 6, delayMs = 1500) {
    try {
      const s = JSON.stringify(replOut || '');
      const m = s.match(/https?:\/\/[^"\s}]+?\.(png|jpg|jpeg)/i);
      if (!m) return null;
      const url = m[0];
      for (let i = 0; i < retries; i++) {
        const dataUrl = await fetchUrlToDataUrl(url);
        if (dataUrl) return dataUrl;
        // wait before next try
        await new Promise((r) => setTimeout(r, delayMs));
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  const generateRaccoon = async () => {
    setLoading(true);
    setMessage('🎨 Generating personalized Goblin...');
    setGeneratedImage(null);
    setMergedPreview(null);
    setReplicateOutput(null);

    try {
      const res = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleUrl: undefined, // optional: use default; or set custom style URL string
          pfpUrl: profile?.pfp_url,
        }),
      });
      const j = await res.json();

      if (!res.ok) {
        console.error('generate error', j);
        setMessage(`❌ ${j?.error || 'Generation failed'}`);
        setLoading(false);
        return;
      }

      // debug store
      setReplicateOutput(j.replicate_output ?? j);

      // merged preview (instant) — display it while final arrives
      if (j.merged_preview) {
        setMergedPreview(j.merged_preview);
        setGeneratedImage(j.merged_preview); // show preview immediately
      }

      // if server already returned final data url -> use it
      if (j.final_image_data_url) {
        setGeneratedImage(j.final_image_data_url);
        setMessage('✅ Ready to mint!');
        setLoading(false);
        return;
      }

      // otherwise try to poll for a remote URL inside replicate_output
      const polled = await tryPollForImage(j.replicate_output ?? j);
      if (polled) {
        setGeneratedImage(polled);
        setMessage('✅ Ready to mint!');
        setLoading(false);
        return;
      }

      // fallback: sometimes replicate_output itself contains direct url string(s)
      // attempt one more extraction from replicate_output
      try {
        const s = JSON.stringify(j.replicate_output || '');
        const m = s.match(/https?:\/\/[^"\s}]+?\.(png|jpg|jpeg)/i);
        if (m?.[0]) {
          const d = await fetchUrlToDataUrl(m[0]);
          if (d) {
            setGeneratedImage(d);
            setMessage('✅ Ready to mint!');
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // ignore
      }

      // if we reach here, we have a merged preview but no final image yet
      setMessage('✅ Preview ready. Final image pending (check debug output).');
      setLoading(false);
    } catch (e: any) {
      console.error('generateRaccoon error', e);
      setMessage(`❌ ${e?.message || 'Failed to generate'}`);
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
            <p style={{ color: '#94a3b8', textAlign: 'center' }}>{loading ? 'Generating...' : 'No image generated'}</p>
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
            TX: {String(txHash).slice(0, 10)}...{String(txHash).slice(-8)}
          </div>
        )}

        {/* debug: replicate output (collapse) */}
        {replicateOutput && (
          <details style={{ marginTop: 12, color: '#cbd5e1' }}>
            <summary>Replicate output (debug)</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(replicateOutput, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
