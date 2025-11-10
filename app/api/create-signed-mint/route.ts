import { NextRequest, NextResponse } from 'next/server';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { address, imageUrl, username, fid } = await req.json();

    if (!address || !imageUrl) {
      return NextResponse.json({ error: 'Missing address or imageUrl' }, { status: 400 });
    }

    const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
    const clientId = process.env.THIRDWEB_CLIENT_ID;
    const secretKey = process.env.THIRDWEB_SECRET_KEY;

    if (!privateKey || !clientId || !secretKey) {
      return NextResponse.json(
        { error: 'Missing environment variables' },
        { status: 500 }
      );
    }

    const contractAddress = '0xD1b64081848FF10000D79D1268bA04536DDF6DbC';

    console.log('🔧 Initializing Thirdweb SDK...');
    const sdk = ThirdwebSDK.fromPrivateKey(privateKey, 'base', {
      clientId,
      secretKey,
    });

    // Step 1: Fetch image
    console.log('📥 Fetching image from URL:', imageUrl);
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to fetch image: ${imgRes.statusText}`);
    }
    const imageData = Buffer.from(await imgRes.arrayBuffer());
    console.log('✅ Image fetched, size:', imageData.length, 'bytes');

    // Step 2: Upload image to IPFS
    console.log('📤 Uploading image to IPFS...');
    const storage = sdk.storage;
    const imageUri = await storage.upload(imageData);
    console.log('✅ Image uploaded to IPFS:', imageUri);

    // Step 3: Create metadata
    const metadata = {
      name: username ? `Raccoon • @${username}` : 'Raccoon',
      description: `AI-generated pixel art raccoon NFT for ${address}`,
      image: imageUri,
      attributes: [
        { trait_type: 'Generator', value: 'AI FLUX.1' },
        { trait_type: 'Style', value: 'Pixel Art' },
        ...(fid ? [{ trait_type: 'FID', value: String(fid) }] : []),
        ...(username ? [{ trait_type: 'Creator', value: `@${username}` }] : []),
      ],
    };

    // Step 4: Upload metadata to IPFS
    console.log('📤 Uploading metadata to IPFS...');
    const metadataUri = await storage.upload(metadata);
    console.log('✅ Metadata uploaded to IPFS:', metadataUri);

    // Step 5: Get contract and generate signature
    console.log('🔗 Getting contract...');
    const contract = await sdk.getContract(contractAddress);

    console.log('📝 Generating mint signature with price 0.0001 ETH...');
    const signedPayload = await contract.signature.generate({
      to: address,
      metadata: metadataUri,
      price: '0.0001', // 0.0001 ETH
      mintStartTime: new Date(0),
      mintEndTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // Valid for 30 days
    });

    console.log('✅ Signature generated successfully!');

    return NextResponse.json({
      success: true,
      signedPayload,
      metadataUri,
      imageUri,
    });
  } catch (error: any) {
    console.error('❌ Backend Error:', error);
    console.error('Error message:', error?.message);
    console.error('Error details:', error?.toString());

    return NextResponse.json(
      {
        error: error?.message || 'Internal server error',
        details: error?.toString(),
      },
      { status: 500 }
    );
  }
}
