import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';

export const runtime = 'nodejs';

// Helper: Convert dataURL to File
async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const arr = dataUrl.split(',');
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }

  const blob = new Blob([u8arr], { type: 'image/png' });
  return new File([blob], filename, { type: 'image/png' });
}

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
        { error: 'Missing Thirdweb credentials: set THIRDWEB_CLIENT_ID or THIRDWEB_SECRET_KEY' },
        { status: 500 }
      );
    }

    // Initialize Thirdweb SDK
    const sdk = await ThirdwebSDK.fromPrivateKey(privateKey, chainId, {
      clientId,
      secretKey,
    });

    const contract = await sdk.getContract(contractAddress);

    // Convert image URL to File
    let file: File;

    if (imageUrl.startsWith('data:')) {
      // dataURL -> File
      file = await dataUrlToFile(imageUrl, `raccoon_${Date.now()}.png`);
    } else if (imageUrl.startsWith('http')) {
      // HTTP URL -> Blob -> File
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch image: ${response.status}` },
          { status: 400 }
        );
      }
      const blob = await response.blob();
      file = new File([blob], `raccoon_${Date.now()}.png`, { type: 'image/png' });
    } else {
      return NextResponse.json({ error: 'Invalid imageUrl' }, { status: 400 });
    }

    // Upload to IPFS via Thirdweb storage
    let imageUri: string;
    try {
      const storage = sdk.storage;
      const uploadHash = await storage.upload(file);
      imageUri = storage.resolveScheme(uploadHash);
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
      const metadataJson = JSON.stringify(metadata);
      const metadataBlob = new Blob([metadataJson], { type: 'application/json' });
      const metadataFile = new File([metadataBlob], 'metadata.json', {
        type: 'application/json',
      });
      const metadataHash = await storage.upload(metadataFile);
      metadataUri = storage.resolveScheme(metadataHash);
    } catch (e: any) {
      console.error('Metadata upload error:', e);
      return NextResponse.json(
        { error: `Metadata upload failed: ${e?.message}` },
        { status: 500 }
      );
    }

    // Prepare mint signature
    const priceWei = '100000000000000'; // 0.0001 ETH in wei
    const maxSupply = 5000;
    const royaltyBps = 500; // 5%
    const royaltyRecipient = privateKey; // or set a specific address

    // Get contract ABI and prepare signature
    try {
      // Create minting struct
      const mintRequest = {
        to: address,
        royaltyRecipient,
        royaltyBps,
        primarySaleRecipient: address,
        uri: metadataUri,
        quantity: 1,
        pricePerToken: priceWei,
        currency: '0x0000000000000000000000000000000000000000', // ETH
        validityStartTimestamp: Math.floor(Date.now() / 1000),
        validityEndTimestamp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
        uid: '0x0000000000000000000000000000000000000000000000000000000000000000',
      };

      // Generate signature using Thirdweb's built-in signing
      const signer = sdk.getSigner();
      if (!signer) {
        throw new Error('Failed to get signer');
      }

      // Encode the mint request
      // Note: This depends on your contract's specific signature scheme
      // For Thirdweb's ERC721SignatureMint, you'll need to use their encoding
      const signature = await signer.signMessage(
        JSON.stringify(mintRequest)
      );

      return NextResponse.json({
        success: true,
        mintRequest,
        signature: signature as `0x${string}`,
        priceWei,
        metadataUri,
        imageUri,
      });
    } catch (e: any) {
      console.error('Signing error:', e);
      return NextResponse.json(
        { error: `Mint signing failed: ${e?.message}` },
        { status: 500 }
      );
    }
  } catch (e: any) {
    console.error('Mint route error:', e);
    return NextResponse.json(
      { error: e?.message || 'server_error' },
      { status: 500 }
    );
  }
}
