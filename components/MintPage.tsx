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
        if (!fid) return;
        const r = await fetch('/api/fetch-pfp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid }),
        });
        const j = await r.json();
        setProfile({
          display_name: j.display_name || '',
          username: j.username || '',
          pfp_url: j.pfp_url || null,
          fid,
        });
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
      // 2. Encode mint(string) call - CORRECT!
      const data = encodeFunctionData({
        abi: MINT_ABI,
        functionName: 'mint',
        args: [metadataUri], // ← Only metadataUri, no address!
      });
      // 3. Send transaction with payment
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
      {/* Header avatar + username */}
      {profile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(50,30,40,0.6)",
            borderRadius: "16px",
            padding: "12px 24px",
            marginBottom: "18px",
            gap: "12px",
            width: "fit-content",
            position: "relative",
          }}
        >
          <img
            src={profile.pfp_url || ""}
            alt="pfp"
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "12px",
              border: "3px solid #E4196B",
              background: "#101016"
            }}
          />
          <div style={{ fontWeight: "bold", color: "#fff", fontSize: "18px" }}>
            @{profile.username}
          </div>
          {/* badge verified */}
          <img src="/verified-badge.svg" alt="verified"
            style={{
              position: "absolute", left: "38px", bottom: "8px", width: "23px", height: "23px"
            }}
          />
        </div>
      )}

      <div
        style={{
          background: "#36303c",
          borderRadius: "20px",
          padding: "24px 22px 22px 22px",
          boxShadow: "0 2px 22px 0 rgba(0,0,0,0.16)",
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: "350px"
        }}
      >
        <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#fff", marginBottom: "21px" }}>
          🦝 Raccoon Mint
        </div>

        {/* NFT image */}
        <div style={{
          width: "290px",
          height: "290px",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#ebd164",
          marginBottom: "17px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          {generatedImage ? (
            <img src={generatedImage} alt="Raccoon NFT" style={{ width: '100%', height: '100%', objectFit: "contain" }} />
          ) : (
            <span style={{ color: "#aaa", fontSize: "1.3rem" }}>No image generated</span>
          )}
        </div>

        <div className="flex flex-col gap-1 text-gray-300 text-sm mb-2">
          <div>💼 {shortAddr || 'Not connected'}</div>
        </div>

        {/* Buttons */}
        <button
          disabled={loading}
          onClick={generateRaccoon}
          style={{
            marginBottom: "12px",
            borderRadius: "8px",
            padding: "10px 0",
            background: "#23b168",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1rem",
            width: "100%",
            border: "none",
            cursor: "pointer",
          }}
        >
          {loading ? '⏳ Generating...' : '🎨 Generate Raccoon'}
        </button>

        <button
          disabled={isPending || isConfirming}
          onClick={performMint}
          style={{
            marginBottom: "12px",
            borderRadius: "8px",
            padding: "10px 0",
            background: "#892adb",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1rem",
            width: "100%",
            border: "none",
            cursor: "pointer",
          }}
        >
          {isPending || isConfirming ? '⏳ Minting...' : '💰 Mint (0.0001 ETH)'}
        </button>

        {/* Status message */}
        {message && (
          <div style={{ fontSize: "1rem", color: "#fff", background: "#222", borderRadius: "8px", padding: "8px 14px", marginTop: "6px", width: "100%", textAlign: "center" }}>
            {message}
          </div>
        )}
        {/* TX hash */}
        {txHash && (
          <div style={{ fontSize: "0.95rem", color: "#bbb", marginTop: "7px" }}>
            TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </div>
        )}
      </div>
    </div>
  );
}
