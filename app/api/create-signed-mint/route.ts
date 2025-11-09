import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { address, imageUrl, fid, username } = await req.json();

    // Validate inputs
    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
    }

    // Validate env vars
    const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Missing THIRDWEB_ADMIN_PRIVATE_KEY' },
        { status: 500 }
      );
    }

    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453);
    const contractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT as `0x${string}`;

    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_NFT_CONTRACT' },
        { status: 500 }
      );
    }

    const clientId = process.env.THIRDWEB_CLIENT_ID;
    const secretKey = process.env.THIRDWEB_SECRET_KEY;

    if (!clientId && !secretKey) {
      return NextResponse.json(
        { error: 'Missing Thirdweb credentials' },
        { status: 500 }
      );
    }

    // Initialize Thirdweb SDK
    const sdk = ThirdwebSDK.fromPrivateKey(privateKey, chainId, {
      clientId,
      secretKey,
    });

    // ✅ FIX: Convert dataURL to raw data, not File
    let imageData: string | Buffer;

    if (imageUrl.startsWith('data:')) {
      // Extract base64 data
      const base64Data = imageUrl.split(',')[1];
      imageData = base64Data; // Keep as base64 string
    } else if (imageUrl.startsWith('http')) {
      // Fetch HTTP image
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

    // Upload to IPFS
    let imageUri: string;
    try {
      const storage = sdk.storage;
      
      // ✅ FIX: Upload raw data directly
      const uploadResult = await storage.upload(imageData);
      imageUri = storage.resolveScheme(uploadResult);
      
      console.log('Image uploaded to IPFS:', imageUri);
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
      description: `AI-generated pixel art raccoon NFT. Generated for ${username || address}`,
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
      
      console.log('Metadata uploaded to IPFS:', metadataUri);
    } catch (e: any) {
      console.error('Metadata upload error:', e);
      return NextResponse.json(
        { error: `Metadata upload failed: ${e?.message}` },
        { status: 500 }
      );
    }

    // Return mint data (your contract handles the actual minting)
    const priceWei = '100000000000000'; // 0.0001 ETH

    return NextResponse.json({
      success: true,
      metadataUri,
      imageUri,
      priceWei,
      // For signature-based minting, you'd generate signature here
      // But for direct minting, just return the URIs
    });
  } catch (e: any) {
    console.error('Mint route error:', e);
    return NextResponse.json(
      { error: e?.message || 'server_error' },
      { status: 500 }
    );
  }
}
