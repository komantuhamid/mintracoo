'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { parseAbi, encodeFunctionData, isAddress } from 'viem';
import sdk from '@farcaster/miniapp-sdk';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useMiniEnv } from '@/hooks/useMiniEnv';

// ---------- helpers ----------
function normalizeAddress(input: string) {
  const cleaned = (input || '')
    .trim()
    .replace(/^['\"]|['\"]$/g, '')
    .replace(/\s+/g, '')
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  return cleaned.startsWith('0x') ? cleaned : `0x${cleaned}`;
}

const RAW_ENV = process.env.NEXT_PUBLIC_NFT_CONTRACT ?? '';
const NORMAL = normalizeAddress(RAW_ENV);
const VALID =
  NORMAL.length === 42 && /^0x[0-9a-fA-F]{40}$/.test(NORMAL) && isAddress(NORMAL);
const CONTRACT_ADDRESS = (VALID ? NORMAL : '') as `0x${string}`;
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453);

// minimal ABI
const MINT_ABI = parseAbi([
  'function mintWithSignature((address,address,uint256,address,string,uint256,address,uint128,uint128,bytes32), bytes) payable returns (uint256)',
]);

export default function MintPage() {
  // ===== WAGMI HOOKS =====
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // ===== MINI ENV =====
  const { isMini } = useMiniEnv();

  // ===== UI STATE =====
  const [profile, setProfile] = useState<any>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);

  const shortAddr = useMemo(
    () => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''),
    [address]
  );

  // ===== INITIALIZE APP =====
  useEffect(() => {
    const initApp = async () => {
      try {
        await sdk.actions.ready();
        setIsAppReady(true);
      } catch (error) {
        console.error('Error initializing', error);
        setIsAppReady(true);
      }
    };
    initApp();
  }, []);

  // ===== AUTO-CONNECT =====
  useEffect(() => {
    const autoConnectFarcaster = async () => {
      if (!isAppReady) return;

      try {
        const context = await sdk.context;
        if (context?.user && !isConnected && connectors.length > 0) {
          await connect({ connector: connectors[0] });
        }
      } catch (error) {
        console.log('Farcaster context error', error);
      }
    };

    autoConnectFarcaster();
  }, [connectors, isConnected, connect, isAppReady]);

  // ===== FETCH PROFILE =====
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
        console.error('pfp error', e);
      }
    })();
  }, []);

  const disconnectAll = () => {
    disconnect();
    setMessage('Disconnected');
  };

  // ===== GENERATE ART =====
  const generateRaccoon = async () => {
    setLoading(true);
    setMessage('Generating raccoon pixel art…');
    try {
      const res = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: 'premium collectible raccoon pixel portrait 1024x1024',
        }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Generation failed');

      setGeneratedImage(j.generated_image_url || j.imageUrl || j.url);
      setMessage('Done! Ready to mint.');
    } catch (e: any) {
      setMessage(e?.message || 'Generation error');
    } finally {
      setLoading(false);
    }
  };

  // ===== REQUEST SIGNED MINT =====
  const requestSignedMint = async () => {
    const r = await fetch('/api/create-signed-mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address,
        imageUrl: generatedImage,
        username: profile?.username,
        fid: profile?.fid,
      }),
    });

    const j = await r.json();
    if (!r.ok || j.error) throw new Error(j.error || 'Sign mint failed');
    return j;
  };

  // ===== PERFORM MINT (USING SDK DIRECTLY) =====
  const performMint = async () => {
    if (!VALID) {
      return setMessage(`Invalid contract address`);
    }

    if (!address) return setMessage('Wallet not connected');
    if (!generatedImage) return setMessage('Generate image first');

    setMinting(true);
    setMessage('Preparing transaction...');

    try {
      const mintData = await requestSignedMint();
      const { mintRequest, signature, priceWei } = mintData;

      const data = encodeFunctionData({
        abi: MINT_ABI,
        functionName: 'mintWithSignature',
        args: [mintRequest, signature],
      });

      // Convert to hex value
      const valueHex = priceWei && priceWei !== '0' 
        ? ('0x' + BigInt(priceWei).toString(16)) 
        : undefined;

      console.log('Sending transaction with:', { 
        to: CONTRACT_ADDRESS, 
        data, 
        value: valueHex,
        chainId: CHAIN_ID 
      });

      // ✅ USE SDK.ACTIONS DIRECTLY (Most Reliable)
      try {
        // Try wallet_sendCalls first (newer method)
        if (sdk.actions?.wallet_sendCalls) {
          await sdk.actions.wallet_sendCalls({
            calls: [
              {
                chainId: `eip155:${CHAIN_ID}`,
                to: CONTRACT_ADDRESS,
                data,
                ...(valueHex ? { value: valueHex } : {}),
              },
            ],
          });
          setMessage('✅ Transaction sent! Confirm in your wallet.');
          setMinting(false);
          return;
        }
      } catch (e) {
        console.log('wallet_sendCalls failed, trying wallet_sendTransaction:', e);
      }

      // Fallback to wallet_sendTransaction
      try {
        if (sdk.actions?.wallet_sendTransaction) {
          await sdk.actions.wallet_sendTransaction({
            chainId: `eip155:${CHAIN_ID}`,
            to: CONTRACT_ADDRESS,
            data,
            ...(valueHex ? { value: valueHex } : {}),
          });
          setMessage('✅ Transaction sent! Confirm in your wallet.');
          setMinting(false);
          return;
        }
      } catch (e) {
        console.log('wallet_sendTransaction failed:', e);
      }

      // If we get here, SDK methods didn't work
      setMessage('❌ Wallet API not available. Please try again.');
      
    } catch (e: any) {
      console.error('Mint error:', e);
      setMessage(`❌ ${e?.message || 'Mint failed'}`);
    } finally {
      setMinting(false);
    }
  };

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          🎨 Raccoon Mint
        </h1>

        {/* Generated Image */}
        <div className="mb-6 bg-slate-700 rounded-lg p-4 min-h-64 flex items-center justify-center border-2 border-slate-600">
          {generatedImage ? (
            <img
              src={generatedImage}
              alt="Generated Raccoon"
              className="w-full h-auto rounded"
            />
          ) : (
            <span className="text-slate-400 text-sm">No image generated yet</span>
          )}
        </div>

        {/* Profile Info */}
        {profile && (
          <div className="mb-6 p-4 bg-slate-700 rounded-lg border border-slate-600">
            <p className="text-slate-300 text-sm">
              <strong>User:</strong> {profile.username || profile.display_name}
            </p>
            {profile.pfp_url && (
              <img
                src={profile.pfp_url}
                alt="PFP"
                className="w-12 h-12 mt-2 rounded-full"
              />
            )}
          </div>
        )}

        {/* Wallet Status */}
        <div className="mb-6 p-4 bg-slate-700 rounded-lg border border-slate-600">
          <p className="text-slate-300 text-sm">
            <strong>Wallet:</strong> {shortAddr || 'Connecting...'}
          </p>
          {isConnected && address ? (
            <button
              onClick={disconnectAll}
              className="mt-2 w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-sm transition"
            >
              Disconnect
            </button>
          ) : (
            <p className="mt-2 text-sm text-yellow-400">
              {isAppReady ? '🔄 Auto-connecting...' : '⏳ Initializing...'}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={generateRaccoon}
            disabled={loading}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded font-semibold transition"
          >
            {loading ? 'Generating…' : '🎨 Generate Raccoon'}
          </button>

          <button
            onClick={performMint}
            disabled={minting || !address || !generatedImage}
            className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded font-semibold transition"
          >
            {minting ? 'Minting…' : '🎯 Mint 0.0001 ETH'}
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className="p-4 bg-slate-700 rounded-lg border border-slate-600 text-slate-200 text-sm">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
