import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import { BaseSepoliaTestnet, Base } from '@thirdweb-dev/chains';

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

    // ✅ Use Base chain with custom RPC
    const baseChain = {
      ...Base,
      rpc: ['https://mainnet.base.org'], // Official Base RPC
    };

    // Initialize SDK
    const sdk = ThirdwebSDK.fromPrivateKey(
      privateKey,
      baseChain,
      {
        clientId,
        secretKey,
        gasless: false,
      }
    );

    // Convert image
    let imageData: string | Buffer;

    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1];
      imageData = base64Data;
    } else if (imageUrl.startsWith('http')) {
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

    // ✅ MINT NFT
    try {
      const contract = await sdk.getContract(contractAddress);
      
      console.log('🎯 Minting to:', address);
      console.log('🎯 Metadata:', metadataUri);

      // Call mintTo with retry logic
      let tx;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          tx = await contract.call('mintTo', [address, metadataUri]);
          break;
        } catch (err: any) {
          attempts++;
          console.log(`Attempt ${attempts} failed:`, err.message);
          
          if (attempts === maxAttempts) {
            throw err;
          }
          
          // Wait 2 seconds before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (!tx) {
        throw new Error('Failed to mint after retries');
      }
      
      console.log('🎉 Minted successfully!');
      console.log('TX:', tx.receipt.transactionHash);

      // Get token ID
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
