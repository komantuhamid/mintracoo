'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { parseAbi, encodeFunctionData, parseEther } from 'viem';
import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';

// Define a simple type for the Farcaster identity
type FarcasterIdentity = {
  fid: number;
  pfpUrl: string;
  username: string;
};

// Custom Hook to get Farcaster Identity (from your old game)
const useFarcasterIdentity = () => {
  const [identity, setIdentity] = useState<FarcasterIdentity | null>(null);
  
  useEffect(() => {
    // The Farcaster client injects the identity into the window object
    const fcIdentity = (window as any).farcaster?.identity;
    if (fcIdentity) {
      setIdentity({
        fid: fcIdentity.fid,
        pfpUrl: fcIdentity.pfp,
        username: fcIdentity.displayName,
      });
    }

    // Also listen for messages from the client, which is a more reliable way
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'identity' && event.data.identity) {
        setIdentity({
            fid: event.data.identity.fid,
            pfpUrl: event.data.identity.pfp,
            username: event.data.identity.displayName,
        });
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return identity;
};


// Main Mint Page Component
const CONTRACT_ADDRESS = '0x1c60072233E9AdE9312d35F36a130300288c27F0' as `0x${string}`;
const MINT_ABI = parseAbi(['function mint(string memory tokenURI_) payable']);

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendTransaction, isPending, data: txHash } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const fcIdentity = useFarcasterIdentity(); // Use the custom hook

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateGoblin = async () => {
    setLoading(true);
    setError(null);
    setGeneratedImage(null);
    try {
      const res = await fetch('/api/generate-art', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setGeneratedImage(data.imageUrl);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async () => {
    if (!address || !generatedImage) return;

    try {
      const res = await fetch('/api/create-signed-mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          imageUrl: generatedImage,
          username: fcIdentity?.username,
          fid: fcIdentity?.fid,
        }),
      });

      if (!res.ok) throw new Error('Failed to create signed mint');
      const { metadataUri } = await res.json();

      const data = encodeFunctionData({
        abi: MINT_ABI,
        functionName: 'mint',
        args: [metadataUri],
      });

      sendTransaction({ to: CONTRACT_ADDRESS, data, value: parseEther('0.00069') });
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#0d0d0d', color: '#fff', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', color: '#4CAF50' }}>👺 Goblin Mint</h1>
      
      {isConnected && address ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #333', borderRadius: '8px', backgroundColor: '#1a1a1a' }}>
            {fcIdentity?.pfpUrl && (
              <img src={fcIdentity.pfpUrl} alt="Farcaster PFP" style={{ width: 40, height: 40, borderRadius: '50%' }} />
            )}
            <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
            <button onClick={() => disconnect()} style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', background: '#f44336', color: 'white', cursor: 'pointer' }}>Disconnect</button>
          </div>

          {!generatedImage && (
            <button onClick={generateGoblin} disabled={loading} style={{ padding: '12px 20px', fontSize: '16px', cursor: 'pointer', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>
              {loading ? '⏳ Generating...' : '🎨 Generate Goblin'}
            </button>
          )}

          {generatedImage && (
            <div style={{ textAlign: 'center' }}>
              <img src={generatedImage} alt="Generated Goblin" style={{ width: '256px', height: '256px', border: '2px solid #4CAF50', borderRadius: '10px' }} />
              <button onClick={handleMint} disabled={isPending || isConfirming} style={{ marginTop: '20px', padding: '12px 20px', fontSize: '16px', cursor: 'pointer', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px' }}>
                {isPending ? 'Confirming...' : isConfirming ? 'Minting...' : 'Mint NFT'}
              </button>
            </div>
          )}
          {isConfirmed && <p style={{ color: '#4CAF50' }}>Success! Your Goblin has been minted.</p>}
          {txHash && (
            <p><a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2196F3' }}>View on Basescan</a></p>
          )}
          {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <p>Connect your wallet to begin.</p>
          {connectors.map((connector) => (
            <button key={connector.uid} onClick={() => connect({ connector })} style={{ margin: '5px', padding: '10px 15px', cursor: 'pointer' }}>
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
