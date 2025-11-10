import { NextRequest, NextResponse } from 'next/server';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import { BaseGoerli } from '@thirdweb-dev/chains';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { address, imageUrl, username, fid } = await req.json();

    if (!address || !imageUrl) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: 'Missing THIRDWEB_ADMIN_PRIVATE_KEY' }, { status: 500 });
    }

    const contractAddress = '0xD1b64081848FF10000D79D1268bA04536DDF6DbC';

    console.log('🔧 Initializing SDK...');
    
    // Initialize SDK for Base mainnet
    const sdk = ThirdwebSDK.fromPrivateKey(
      privateKey,
      'base', // Base mainnet
      {
        clientId: process.env.THIRDWEB_CLIENT_ID,
        secretKey: process.env.THIRDWEB_SECRET_KEY,
      }
    );

    // Fetch image
    console.log('📥 Fetching image...');
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('Failed to fetch image');
    const imageData = Buffer.from(await imgRes.arrayBuffer());

    // Upload image
    console.log('📤 Uploading image...');
    const storage = sdk.storage;
    const imageUri = await storage.upload(imageData);
    console.log('✅ Image:', imageUri);

    // Create metadata
    const metadata = {
      name: username ? `Raccoon • @${username}` : 'Raccoon',
      description: `AI pixel art raccoon for ${address}`,
      image: imageUri,
      attributes: [
        { trait_type: 'Generator', value: 'AI FLUX.1' },
        { trait_type: 'Style', value: 'Pixel Art' },
        ...(fid ? [{ trait_type: 'FID', value: String(fid) }] : []),
      ],
    };

    // Upload metadata
    console.log('📤 Uploading metadata...');
    const metadataUri = await storage.upload(metadata);
    console.log('✅ Metadata:', metadataUri);

    // Get contract
    const contract = await sdk.getContract(contractAddress, 'signature-drop');

    // Generate signature payload
    console.log('📝 Generating signature...');
    
    const payload = await contract.signature.generate({
      to: address,
      metadata: metadataUri,
      price: '0.0001', // 0.0001 ETH
      mintStartTime: new Date(),
      mintEndTime: new Date(Date.now() + 3600 * 1000), // 1 hour from now
    });

    console.log('✅ Signature generated!');

    return NextResponse.json({
      success: true,
      payload: payload.payload,
      signature: payload.signature,
      metadataUri,
      imageUri,
    });
  } catch (e: any) {
    console.error('❌ Error:', e);
    console.error('Stack:', e.stack);
    return NextResponse.json(
      { error: e?.message || 'Server error', details: e.stack },
      { status: 500 }
    );
  }
}
