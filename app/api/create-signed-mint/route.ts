import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { address, imageUrl, fid, username } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
    }

    // Get env vars
    const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Missing THIRDWEB_ADMIN_PRIVATE_KEY' },
        { status: 500 }
      );
    }

    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453);
    const contractAddress = '0xD1b64081848FF10000D79D1268bA04536DDF6DbC';
    const clientId = process.env.THIRDWEB_CLIENT_ID;
    const secretKey = process.env.THIRDWEB_SECRET_KEY;

    if (!clientId && !secretKey) {
      return NextResponse.json(
        { error: 'Missing Thirdweb credentials' },
        { status: 500 }
      );
    }

    // Initialize SDK with YOUR admin wallet (has MINTER role)
    const sdk = ThirdwebSDK.fromPrivateKey(privateKey, chainId, {
      clientId,
      secretKey,
    });

    // Convert image
    let imageData: string | Buffer;

    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1];
      imageData = base64Data;
    } else if (imageUrl.startsWith('http')) {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch image: ${response.status}` },
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
      description: `AI-generated pixel art raccoon NFT. Created for ${username || address}`,
      image: imageUri,
      attributes: [
        { trait_type: 'Generator', value: 'Hugging Face FLUX.1' },
        { trait_type: 'Style', value: 'Pixel Art' },
        { trait_type: 'Creator', value: username || 'Anonymous' },
        { trait_type: 'FID', value: String(fid || 0) },
      ],
    };

    // Upload metadata to IPFS
    let metadataUri: string;
    try {
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

    // ✅ MINT NFT FROM BACKEND (Your wallet has permission!)
    try {
      const contract = await sdk.getContract(contractAddress);
      
      console.log('🎯 Minting to:', address);
      console.log('🎯 Metadata:', metadataUri);

      // Call mintTo function
      const tx = await contract.call('mintTo', [address, metadataUri]);
      
      console.log('🎉 Minted successfully!');
      console.log('TX Hash:', tx.receipt.transactionHash);

      // Extract token ID from events
      let tokenId = 'unknown';
      if (tx.receipt.events && tx.receipt.events.length > 0) {
        const transferEvent = tx.receipt.events.find((e: any) => e.event === 'Transfer');
        if (transferEvent && transferEvent.args && transferEvent.args.tokenId) {
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
        { error: `Minting failed: ${e?.message}` },
        { status: 500 }
      );
    }
  } catch (e: any) {
    console.error('❌ Route error:', e);
    return NextResponse.json(
      { error: e?.message || 'server_error' },
      { status: 500 }
    );
  }
}
