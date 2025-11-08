'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { parseAbi, encodeFunctionData, isAddress } from 'viem';
import { sdk } from '@farcaster/miniapp-sdk';
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
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org';

// minimal ABI for mintWithSignature
const MINT_ABI = parseAbi([
  'function mintWithSignature((address,address,uint256,address,string,uint256,address,uint128,uint128,bytes32), bytes) payable returns (uint256)',
]);

export default function MintPage() {
  // wagmi (outside mini app only)
  const { address: wagmiAddress } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // mini env
  const { isMini, ctx } = useMiniEnv();

  // ui state
  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const shortAddr = useMemo(
    () => (activeAddress ? `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}` : ''),
    [activeAddress]
  );

  // pick active address
  useEffect(() => {
    if (isMini) {
      setActiveAddress(ctx?.user?.ethAddress ?? ctx?.user?.address ?? null);
    } else if (wagmiAddress) {
      setActiveAddress(wagmiAddress);
    } else {
      setActiveAddress(null);
    }
  }, [isMini, ctx?.user?.ethAddress, ctx?.user?.address, wagmiAddress]);

  // -------- Farcaster profile --------
  useEffect(() => {
    const fid = ctx?.user?.fid || ctx?.user?.id;
    if (!fid) return;

    (async () => {
      try {
        const r = await fetch('/api/fetch-pfp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid }),
        });
        const j = await r.json();
        setProfile({
          display_name: j.display_name || ctx?.user?.displayName || '',
          username: j.username || ctx?.user?.username || '',
          pfp_url: j.pfp_url || ctx?.user?.pfpUrl || null,
          fid,
        });
      } catch (e) {
        console.error('pfp error', e);
      }
    })();
  }, [ctx?.user]);

  // Connect mini app wallet via SDK
  const connectMiniViaSDK = async () => {
    try {
      setMessage('Connecting mini wallet…');

      // Ensure SDK is ready
      await (sdk as any).actions?.ready?.();

      // Try to get from context first
      const c = await (sdk as any).context;
      const fromCtx: string | undefined =
        c?.user?.ethAddress || c?.user?.address || c?.user?.walletAddress;

      if (fromCtx) {
        setActiveAddress(fromCtx);
        setMessage('Mini wallet connected (from context)');
        return;
      }

      const A: any = (sdk as any).actions;

      // Helper: convert any shape to EVM addresses
      const pickEth = (res: any): string[] => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.addresses)) return res.addresses;
        if (Array.isArray(res?.ethereum)) return res.ethereum;
        if (Array.isArray(res?.evm)) return res.evm;
        if (typeof res?.address === 'string') return [res.address];
        return [];
      };

      // Request addresses with different parameter formats
      try {
        await A.wallet_requestAddresses?.({ type: 'evm' });
      } catch {}
      try {
        await A.wallet_requestAddresses?.({ chainId: CHAIN_ID });
      } catch {}
      try {
        await A.wallet_connect?.({ chainId: CHAIN_ID });
      } catch {}

      // Get addresses
      let addrs: string[] = [];
      try {
        addrs = pickEth(await A.wallet_getAddresses?.());
      } catch {}

      if (!addrs.length) {
        try {
          addrs = pickEth(await A.wallet_getAddresses?.({ type: 'evm' }));
        } catch {}
      }

      if (!addrs.length) {
        try {
          addrs = pickEth(await A.wallet_getAddresses?.({ chainId: CHAIN_ID }));
        } catch {}
      }

      if (addrs[0]) {
        setActiveAddress(addrs[0]);
        setMessage('Mini wallet connected');
        return;
      }

      setMessage('No mini wallet address found. Enable Warpcast Wallet in Warpcast Settings.');
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message || String(e));
    }
  };

  // Auto-connect in mini app
  useEffect(() => {
    let done = false;

    (async () => {
      if (!isMini || activeAddress) return;

      try {
        await (sdk as any).actions?.ready?.();
        const c = await (sdk as any).context;
        const fromCtx: string | undefined =
          c?.user?.ethAddress || c?.user?.address || c?.user?.walletAddress;

        if (fromCtx) {
          setActiveAddress(fromCtx);
          setMessage('Mini wallet connected (auto)');
          done = true;
          return;
        }
      } catch {}

      if (!done) connectMiniViaSDK();
    })();
  }, [isMini, activeAddress]);

  const disconnectAll = () => {
    setActiveAddress(null);
    disconnect();
    setMessage('Disconnected');
  };

  // -------- Generate art --------
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

  // -------- Request signed mint payload from server --------
  const requestSignedMint = async () => {
    const r = await fetch('/api/create-signed-mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: activeAddress,
        imageUrl: generatedImage,
        username: profile?.username,
        fid: profile?.fid,
      }),
    });

    const j = await r.json();
    if (!r.ok || j.error) throw new Error(j.error || 'Sign mint failed');
    return j as { mintRequest: any; signature: `0x${string}`; priceWei: string };
  };

  // -------- Perform mint --------
  const performMint = async () => {
    if (!VALID) {
      return setMessage(
        `Invalid contract address in env: ${
          NORMAL ? NORMAL.slice(0, 6) + '…' + NORMAL.slice(-4) : 'empty'
        } (len=${NORMAL.length})`
      );
    }

    if (!activeAddress) return setMessage('Connect wallet first');
    if (!generatedImage) return setMessage('Generate image first');

    setMinting(true);
    setMessage('');

    try {
      const { mintRequest, signature, priceWei } = await requestSignedMint();

      const data = encodeFunctionData({
        abi: MINT_ABI,
        functionName: 'mintWithSignature',
        args: [mintRequest, signature],
      });

      const valueHex =
        priceWei && priceWei !== '0' ? ('0x' + BigInt(priceWei).toString(16)) : undefined;

      const actions: any = (sdk as any).actions;

      if (isMini) {
        // Inside Farcaster Mini App
        if (actions?.wallet_sendCalls) {
          await actions.wallet_sendCalls({
            chainId: CHAIN_ID,
            calls: [
              {
                to: CONTRACT_ADDRESS,
                data,
                ...(valueHex ? { value: valueHex } : {}),
              },
            ],
          });
          setMessage('Transaction sent via Mini App wallet. Confirm in wallet.');
          setMinting(false);
          return;
        }

        if (actions?.wallet_sendTransaction) {
          await actions.wallet_sendTransaction({
            chainId: CHAIN_ID,
            to: CONTRACT_ADDRESS,
            data,
            ...(valueHex ? { value: valueHex } : {}),
          });
          setMessage('Transaction sent via Mini App wallet. Confirm in wallet.');
          setMinting(false);
          return;
        }

        setMessage('Mini wallet API not available in this client.');
        setMinting(false);
        return;
      }

      // Browser fallback (outside mini app)
      const eth = (window as any).ethereum;
      if (eth?.request) {
        const txHash: string = await eth.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: activeAddress,
              to: CONTRACT_ADDRESS,
              data,
              ...(valueHex ? { value: valueHex } : {}),
            },
          ],
        });

        setMessage(`Tx submitted: ${txHash.slice(0, 10)}… waiting for confirmation…`);

        // Poll for receipt
        const poll = async () => {
          const res = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getTransactionReceipt',
              params: [txHash],
            }),
          });

          const jr = await res.json();
          return jr?.result || null;
        };

        for (let i = 0; i < 30; i++) {
          const rcpt = await poll();
          if (rcpt) {
            setMessage('Mint confirmed ✅');
            break;
          }
          await new Promise((s) => setTimeout(s, 2000));
        }

        setMinting(false);
        return;
      }

      setMessage('No wallet available.');
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message || String(e) || 'Mint failed');
    } finally {
      setMinting(false);
    }
  };

  // -------- UI --------
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
            <strong>Wallet:</strong> {shortAddr || 'Not connected'}
          </p>
          {activeAddress ? (
            <button
              onClick={disconnectAll}
              className="mt-2 w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-sm transition"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connectMiniViaSDK}
              className="mt-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-sm transition"
            >
              Connect Wallet
            </button>
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
            disabled={minting || !activeAddress || !generatedImage}
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
