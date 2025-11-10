import { NextRequest, NextResponse } from 'next/server';
import { ThirdwebStorage } from '@thirdweb-dev/storage';
import { ethers } from 'ethers';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, imageUrl, username, fid } = body;

    console.log('📥 Request received:', { address, imageUrl: imageUrl?.slice(0, 50), username, fid });

    if (!address || !imageUrl) {
      console.log('❌ Missing fields');
      return NextResponse.json({ error: 'Missing address or imageUrl' }, { status: 400 });
    }

    const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
    const clientId = process.env.THIRDWEB_CLIENT_ID;
    const secretKey = process.env.THIRDWEB_SECRET_KEY;

    console.log('🔑 Checking env vars:', { privateKey: !!privateKey, clientId: !!clientId, secretKey: !!secretKey });

    if (!privateKey) {
      console.log('❌ Missing THIRDWEB_ADMIN_PRIVATE_KEY');
      return NextResponse.json({ error: 'Missing THIRDWEB_ADMIN_PRIVATE_KEY' }, { status: 500 });
    }
    if (!clientId || !secretKey) {
      console.log('❌ Missing THIRDWEB_CLIENT_ID or THIRDWEB_SECRET_KEY');
      return NextResponse.json({ error: 'Missing Thirdweb credentials' }, { status: 500 });
    }

    const contractAddress = '0xD1b64081848FF10000D79D1268bA04536DDF6DbC';

    try {
      console.log('🔧 Initializing storage...');
      const storage = new ThirdwebStorage({ secretKey, clientId });

      // Step 1: Fetch image
      console.log('📥 Fetching image from:', imageUrl.slice(0, 100));
      const imgRes = await fetch(imageUrl, { timeout: 10000 });
      
      if (!imgRes.ok) {
        console.log('❌ Image fetch failed:', imgRes.status, imgRes.statusText);
        return NextResponse.json(
          { error: `Failed to fetch image: ${imgRes.statusText}` },
          { status: 400 }
        );
      }

      const imageData = Buffer.from(await imgRes.arrayBuffer());
      console.log('✅ Image fetched:', imageData.length, 'bytes');

      // Step 2: Upload image to IPFS
      console.log('📤 Uploading image to IPFS...');
      const imageUri = await storage.upload(imageData);
      console.log('✅ Image uploaded:', imageUri);

      // Step 3: Create metadata
      const metadata = {
        name: username ? `Raccoon • @${username}` : 'Raccoon',
        description: `AI-generated pixel art raccoon NFT for ${address}`,
        image: imageUri,
        attributes: [
          { trait_type: 'Generator', value: 'AI FLUX.1' },
          { trait_type: 'Style', value: 'Pixel Art' },
          ...(fid ? [{ trait_type: 'FID', value: String(fid) }] : []),
        ],
      };

      // Step 4: Upload metadata to IPFS
      console.log('📤 Uploading metadata to IPFS...');
      const metadataUri = await storage.upload(metadata);
      console.log('✅ Metadata uploaded:', metadataUri);

      // Step 5: Generate EIP-712 signature
      console.log('📝 Generating EIP-712 signature...');

      const currentTime = Math.floor(Date.now() / 1000);

      const payload = {
        to: address,
        royaltyRecipient: address,
        royaltyBps: 0,
        primarySaleRecipient: address,
        uri: metadataUri,
        price: ethers.utils.parseEther('0.0001').toString(),
        currency: ethers.constants.AddressZero,
        validityStartTimestamp: currentTime,
        validityEndTimestamp: currentTime + 3600 * 24 * 30,
