import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for minting

export async function POST(req: NextRequest) {
  try {
    const { address, imageUrl, fid, username } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
    }

    const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Missing THIRDWEB_ADMIN_PRIVATE_KEY' },
        { status: 500 }
      );
    }

    const contractAddress = '0xD1b64081848FF10000D79D1268bA04536DDF6DbC';
    const clientId = process.env.THIRDWEB_CLIENT_ID;
    const secretKey = process.env.THIRDWEB_SECRET_KEY;

    // ✅ Multiple RPC endpoints (fallback if one fails)
    const RPC_ENDPOINTS = [
      'https://base.llamarpc.com',
      'https://mainnet.base.org',
      'https://base-mainnet.public.blastapi.io',
      'https://base.blockpi.network/v1/rpc/public',
    ];

    const baseChainConfig = {
      chainId: 8453,
      rpc: RPC_ENDPOINTS,
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      slug: 'base',
    };

    console.log('Initializing SDK...');
    const sdk = ThirdwebSDK.fromPrivateKey(
      privateKey,
      baseChainConfig,
      {
        clientId,
        secretKey,
      }
    );

    // Convert image
    let imageData: string | Buffer;

    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1];
      imageData = base64Data;
    } else if (imageUrl.startsWith('http')) {
      console.log('Fetching image...');
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch image' },
          { status: 400 }
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      imageData = Buffer.from(arrayBuffer);
    } else {
      return NextResponse.json({ error: 'Invalid imageUrl' }, { status: 400 });
    }

    // Upload image to IPFS
    let imageUri: string;
    try {
      console.log('Uploading image to IPFS...');
      const storage = sdk.storage;
      const uploadResult = await storage.upload(imageData);
      imageUri = storage.resolveScheme(uploadResult);
      console.log('✅ Image uploaded:', imageUri);
    } catch (e: any) {
      console.error('IPFS upload error:', e);
      return NextResponse.json(
        { error: `IPFS upload failed: ${e?.message}` },
        { status: 500 }
      );
    }

    // Create metadata
    const metadata = {
      name: `Raccoon #${Date.now()}`,
      description: `AI-generated pixel art raccoon NFT for ${username || address}`,
      image: imageUri,
      attributes: [
        { trait_type: 'Generator', value: 'AI FLUX.1' },
        { trait_type: 'Style', value: 'Pixel Art' },
        { trait_type: 'Creator', value: username || 'Anonymous' },
        { trait_type: 'FID', value: String(fid || 0) },
      ],
    };

    // Upload metadata
    let metadataUri: string;
    try {
      console.log('Uploading metadata to IPFS...');
      const storage = sdk.storage;
      const uploadResult = await storage.upload(metadata);
      metadataUri = storage.resolveScheme(uploadResult);
      console.log('✅ Metadata uploaded:', metadataUri);
    } catch (e: any) {
      console.error('Metadata upload error:', e);
      return NextResponse.json(
        { error: `Metadata upload failed: ${e?.message}` },
        { status: 500 }
      );
    }

    // ✅ MINT with advanced retry logic
    try {
      console.log('Getting contract...');
      const contract = await sdk.getContract(contractAddress);
      
      console.log('🎯 Minting to:', address);
      console.log('🎯 Metadata:', metadataUri);

      // Retry with exponential backoff
      let tx;
      const maxAttempts = 5;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`Mint attempt ${attempt}/${maxAttempts}...`);
          
          tx = await contract.call('mintTo', [address, metadataUri], {
            gasLimit: 500000, // Increase gas limit
          });
          
          console.log('✅ Transaction sent!');
          break;
        } catch (err: any) {
          console.error(`❌ Attempt ${attempt} failed:`, err.message);
          
          if (attempt === maxAttempts) {
            throw new Error(`Failed after ${maxAttempts} attempts: ${err.message}`);
          }
          
          // Exponential backoff: 2s, 4s, 8s, 16s
          const delay = Math.min(2000 * Math.pow(2, attempt - 1), 16000);
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      if (!tx) {
        throw new Error('Transaction failed');
      }
      
      console.log('🎉 Minted successfully!');
      console.log('TX Hash:', tx.receipt.transactionHash);

      // Extract token ID
      let tokenId = 'unknown';
      if (tx.receipt.events && tx.receipt.events.length > 0) {
        const transferEvent = tx.receipt.events.find((e: any) => e.event === 'Transfer');
        if (transferEvent?.args?.tokenId) {
          tokenId = transferEvent.args.tokenId.toString();
        }
      }

      return NextResponse.json({
        success: true,
        metadataUri,
        imageUri,
        transactionHash: tx.receipt.transactionHash,
        tokenId,
      });
    } catch (e: any) {
      console.error('❌ Mint error:', e);
      return NextResponse.json(
        { error: `Minting failed: ${e?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (e: any) {
    console.error('❌ Route error:', e);
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status: 500 }
    );
  }
}
