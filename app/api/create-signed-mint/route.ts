import { NextRequest, NextResponse } from 'next/server';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import { ethers } from 'ethers';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { address, imageUrl, username, fid } = await req.json();

    if (!address || !imageUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: 'Missing THIRDWEB_ADMIN_PRIVATE_KEY' }, { status: 500 });
    }

    const contractAddress = '0xD1b64081848FF10000D79D1268bA04536DDF6DbC';
    const clientId = process.env.THIRDWEB_CLIENT_ID;
    const secretKey = process.env.THIRDWEB_SECRET_KEY;

    // Initialize SDK
    const sdk = ThirdwebSDK.fromPrivateKey(privateKey, 'base', { clientId, secretKey });

    // Fetch and upload image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 });
    }
    const imageData = Buffer.from(await imgRes.arrayBuffer());
    const storage = sdk.storage;
    const imageUri = await storage.upload(imageData);

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
    const metadataUri = await storage.upload(metadata);
    console.log('✅ Metadata uploaded:', metadataUri);

    // Get contract
    const contract = await sdk.getContract(contractAddress);

    // Create mint request
    const mintRequest = {
      to: address,
      royaltyRecipient: address,
      royaltyBps: 0,
      primarySaleRecipient: address,
      uri: metadataUri,
      price: ethers.utils.parseEther('0.0001').toString(), // ✅ 0.0001 ETH price
      currency: ethers.constants.AddressZero, // Native token (ETH)
      validityStartTimestamp: Math.floor(Date.now() / 1000),
      validityEndTimestamp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
      uid: ethers.utils.id(Date.now().toString()),
    };

    // Generate signature
    const signedPayload = await contract.erc721.signature.generate(mintRequest);

    console.log('✅ Signature generated');

    return NextResponse.json({
      success: true,
      payload: signedPayload.payload,
      signature: signedPayload.signature,
      metadataUri,
      imageUri,
    });
  } catch (e: any) {
    console.error('❌ Error:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
