// app/api/create-signed-mint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ThirdwebStorage } from '@thirdweb-dev/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const storage = new ThirdwebStorage({
  // يفضَّل SECRET_KEY فالسيرفر. غادي يخدم حتى إذا كان غير CLIENT_ID.
  secretKey: process.env.THIRDWEB_SECRET_KEY,
  clientId: process.env.THIRDWEB_CLIENT_ID,
});

type Body = {
  address: `0x${string}`;
  imageUrl: string; // جاية من /api/generate-art
  username?: string;
  fid?: number | string;
};

export async function POST(req: NextRequest) {
  try {
    const { address, imageUrl, username, fid } = (await req.json()) as Body;

    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }
    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
    }
    if (!process.env.THIRDWEB_SECRET_KEY && !process.env.THIRDWEB_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Missing THIRDWEB credentials' },
        { status: 500 }
      );
    }

    // 1) حمّل الصورة من رابط Hugging Face
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('Failed to fetch generated image');

    // ✅ استعمل Buffer ديال Node (ماشي File/Web stream) لتفادي e.on is not a function
    const arrayBuf = await imgRes.arrayBuffer();
    const nodeBuffer = Buffer.from(arrayBuf);

    // 2) رفع الصورة إلى IPFS (يرجع ipfs://...)
    const ipfsImageUri = await storage.upload(nodeBuffer, {
      uploadWithoutDirectory: true,
    });

    // 3) بنِي metadata باستعمال ipfsImageUri
    const name =
      username && username.trim().length > 0
        ? `Raccoon • @${username}`
        : 'Raccoon';

    const metadata = {
      name,
      description: `AI-generated pixel art raccoon NFT. Generated for ${address}${
        fid ? ` (FID ${fid})` : ''
      }`,
      image: ipfsImageUri, // مهم: ipfs://… باش الصورة تبان فالمحافظ/thirdweb
      attributes: [
        { trait_type: 'Generator', value: 'Hugging Face FLUX.1' },
        { trait_type: 'Style', value: 'Pixel Art' },
        ...(fid ? [{ trait_type: 'FID', value: String(fid) }] : []),
        ...(username ? [{ trait_type: 'Creator', value: `@${username}` }] : []),
      ],
    };

    // 4) رفع metadata نفسها لـ IPFS (ipfs://...)
    const metadataUri = await storage.upload(metadata, {
      uploadWithoutDirectory: true,
    });

    // 5) رجّع metadataUri للواجهة (غادي تدير mintTo(address, metadataUri))
    return NextResponse.json({ metadataUri });
  } catch (e: any) {
    console.error('create-signed-mint error:', e);
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status: 500 }
    );
  }
}
