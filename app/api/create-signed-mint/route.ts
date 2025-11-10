import { NextRequest, NextResponse } from 'next/server';
import { ThirdwebStorage } from '@thirdweb-dev/storage';
import { ethers } from 'ethers';

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

    console.log('🔧 Initializing storage...');
    const storage = new ThirdwebStorage({ secretKey, clientId });

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

    // Step 5: Generate EIP-712 signature manually
    console.log('📝 Generating EIP-712 signature...');

    const currentTime = Math.floor(Date.now() / 1000);

    // Create the mint request payload
    const payload = {
      to: address as `0x${string}`,
      royaltyRecipient: address as `0x${string}`,
      royaltyBps: 0,
      primarySaleRecipient: address as `0x${string}`,
      uri: metadataUri,
      price: ethers.utils.parseEther('0.0001').toString(),
      currency: ethers.constants.AddressZero,
      validityStartTimestamp: currentTime,
      validityEndTimestamp: currentTime + 3600 * 24 * 30, // 30 days
      uid: ethers.utils.id(`${address}-${Date.now()}`),
    };

    console.log('Payload:', payload);

    // EIP-712 domain
    const domain = {
      name: 'TokenERC721',
      version: '1',
      chainId: 8453, // Base mainnet
      verifyingContract: contractAddress,
    };

    // EIP-712 types
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

    // Sign with admin private key
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet._signTypedData(domain, types, payload);

    console.log('✅ Signature generated successfully!');
    console.log('Signature:', signature);

    return NextResponse.json({
      success: true,
      payload,
      signature,
      metadataUri,
      imageUri,
    });
  } catch (error: any) {
    console.error('❌ Backend Error:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);

    return NextResponse.json(
      {
        error: error?.message || 'Internal server error',
        details: error?.stack,
      },
      { status: 500 }
    );
  }
}
