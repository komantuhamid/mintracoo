import { NextRequest, NextResponse } from 'next/server';
import { ThirdwebStorage } from '@thirdweb-dev/storage';
import { ethers } from 'ethers';

export const runtime = 'nodejs';

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
    const secretKey = process.env.THIRDWEB_SECRET_KEY;
    const clientId = process.env.THIRDWEB_CLIENT_ID;

    // Initialize storage
    const storage = new ThirdwebStorage({ secretKey, clientId });

    console.log('📥 Fetching image...');
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('Failed to fetch image');
    const imageData = Buffer.from(await imgRes.arrayBuffer());

    // Upload image
    console.log('📤 Uploading image...');
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

    // Create payload
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
      validityEndTimestamp: currentTime + 3600,
      uid: ethers.utils.id(`${address}-${Date.now()}`),
    };

    // Sign with EIP-712
    const domain = {
      name: 'TokenERC721',
      version: '1',
      chainId: 8453,
      verifyingContract: contractAddress,
    };

    const types = {
      MintRequest: [
        { name: 'to', type: 'address' },
        { name: 'royaltyRecipient', type: 'address' },
        { name: 'royaltyBps', type: 'uint256' },
        { name: 'primarySaleRecipient', type: 'address' },
        { name: 'uri', type: 'string' },
        { name: 'price', type: 'uint256' },
        { name: 'currency', type: 'address' },
        { name: 'validityStartTimestamp', type: 'uint128' },
        { name: 'validityEndTimestamp', type: 'uint128' },
        { name: 'uid', type: 'bytes32' },
      ],
    };

    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet._signTypedData(domain, types, payload);

    console.log('✅ Signature generated');

    return NextResponse.json({
      success: true,
      payload,
      signature,
      metadataUri,
      imageUri,
    });
  } catch (e: any) {
    console.error('❌ Error:', e);
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status: 500 }
    );
  }
}
