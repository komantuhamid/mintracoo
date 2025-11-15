'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { parseAbi, encodeFunctionData, parseEther } from 'viem';
import sdk from '@farcaster/miniapp-sdk';
import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';

const CONTRACT_ADDRESS = '0x1c60072233E9AdE9312d35F36a130300288c27F0' as `0x${string}`;
const MINT_ABI = parseAbi([
  'function mint(string memory tokenURI_) payable',
]);
const STYLE_REFERENCE_URL = 'https://up6.cc/2025/10/176316542260411.png';

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
        // ignore
      }
    };
    autoConnect();
  }, [isAppReady, isConnected, connectors, connect]);

  useEffect(() => {
    (async () => {
      try {
        const context = await sdk.context;
        const fid = context?.user?.fid;
        const pfpUrl = context?.user?.pfpUrl;
        if (fid) {
          setProfile({
            pfp_url: pfpUrl || null,
            fid,
            // Only include allowed props here
          });
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (isPending) setMessage('⏳ Confirm in wallet...');
    else if (isConfirming) setMessage('⏳ Confirming...');
    else if (isConfirmed) setMessage('🎉 NFT Minted Successfully!');
  }, [isPending, isConfirming, isConfirmed]);

  const generateRaccoon = async () => {
    setLoading(true);
    setMessage('🎨 Transforming you into a premium NFT...');
    try {
      const res = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pfpUrl: profile?.pfp_url,
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
    <div>
      <h2>🦝 Goblin Mint</h2>

      {profile && (
        <div>
          {profile.pfp_url && (
            <img src={profile.pfp_url} alt="pfp" style={{ width: 96, borderRadius: 18 }} />
          )}
          <div>FID: {profile.fid}</div>
        </div>
      )}

      <div style={{ margin: '24px 0' }}>
        {generatedImage ? (
          <img src={generatedImage} alt="nft" style={{ maxWidth: 320, borderRadius: 18 }} />
        ) : (
          <div>No image generated</div>
        )}
      </div>

      <button disabled={loading} onClick={generateRaccoon}>
        {loading ? '⏳ Generating...' : '🎨 Generate NFT'}
      </button>
      <button disabled={isPending || isConfirming} onClick={performMint}>
        {isPending || isConfirming ? '⏳ Minting...' : '💰 Mint (0.0001 ETH)'}
      </button>

      <div>{message && <div>{message}</div>}</div>
      {txHash && (
        <div>
          TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
        </div>
      )}
    </div>
  );
}
