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

  const shortAddr = useMemo(
    () => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''),
    [address]
  );

  useEffect(() => {
    if (!isConnected) return;
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
          display_name: j.display_name || "",
          username: j.username || "",
          pfp_url: j.pfp_url || "/default-pfp.png",
          fid,
        });
      } catch (e) {}
    })();
  }, [isConnected]);

  useEffect(() => {
    if (isPending) setMessage('⏳ Confirm in wallet...');
    else if (isConfirming) setMessage('⏳ Confirming...');
    else if (isConfirmed) setMessage('🎉 NFT Minted Successfully!');
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#242032] to-[#262024]">
      {/* Header Farcaster info */}
      {isConnected && profile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(50,30,40,0.6)",
            borderRadius: "16px",
            padding: "12px 24px",
            marginBottom: "18px",
            gap: "14px",
            width: "fit-content",
            position: "relative"
          }}
        >
          <img
            src={profile.pfp_url || "/default-pfp.png"}
            alt="pfp"
            style={{
              width: "54px",
              height: "54px",
              borderRadius: "12px",
              border: "3px solid #E4196B",
              background: "#101016",
              objectFit: "cover"
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#fff", fontWeight: "bold", fontSize: "18px" }}>
              {profile.display_name || profile.username || "Unknown"}
            </span>
            {(profile.display_name || profile.username) && (
              <span style={{ color: "#DDD", fontSize: "14px" }}>
                @{profile.username || "unknown"}
              </span>
            )}
          </div>
        </div>
      )}
      {/* ...باقي الكود ديال mint box هنا... */}
    </div>
  );
}
