import { NextRequest, NextResponse } from 'next/server';
import { ThirdwebStorage } from '@thirdweb-dev/storage';

export const runtime = 'nodejs';

const storage = new ThirdwebStorage({
  secretKey: process.env.THIRDWEB_SECRET_KEY,
  clientId: process.env.THIRDWEB_CLIENT_ID,
});

export async function POST(req: NextRequest) {
  try {
    const { address, imageUrl, username, fid } = await req.json();

    if (!address || !imageUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 });
    }
    const imageData = Buffer.from(await imgRes.arrayBuffer());

    // Upload image to IPFS
    const imageUri = await storage.upload(imageData);
    console.log('✅ Image uploaded:', imageUri);

    // Create metadata
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

    // Upload metadata to IPFS
    const metadataUri = await storage.upload(metadata);
    console.log('✅ Metadata uploaded:', metadataUri);

    return NextResponse.json({
      success: true,
      metadataUri,
      imageUri,
    });
  } catch (e: any) {
    console.error('❌ Error:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
