// app/api/create-signed-mint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ThirdwebStorage } from '@thirdweb-dev/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const storage = new ThirdwebStorage({
  // استعمل secret key ديال السيرفر. إذا عندك CLIENT_ID فقط، بدّلها لكن الأفضل للسيرفر: SECRET_KEY
  secretKey: process.env.THIRDWEB_SECRET_KEY,
  clientId: process.env.THIRDWEB_CLIENT_ID, // اختياري
});

type Body = {
  address: `0x${string}`;
  imageUrl: string; // راجعة من /api/generate-art
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

    // 1) جيب الصورة اللي ولات من Hugging Face
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('Failed to fetch generated image');
    const imgArrayBuf = await imgRes.arrayBuffer();

    // 2) رفع الصورة إلى IPFS عبر ThirdwebStorage
    //    مهم: اسم الملف و mimetype باش المحافظ تتعرف على الصورة
    const file = new File([imgArrayBuf], 'raccoon.png', { type: 'image/png' });
    const ipfsImageUri = await storage.upload(file); // => ipfs://...

    // 3) بني الميتاداتا (image = ipfs://... باش تبان ف thirdweb/wallets)
    const name =
      username && username.trim().length > 0
        ? `Raccoon • @${username}`
        : 'Raccoon';
    const description = `AI-generated pixel art raccoon NFT. Generated for ${address}${
      fid ? ` (FID ${fid})` : ''
    }`;

    const metadata = {
      name,
      description,
      image: ipfsImageUri,
      attributes: [
        { trait_type: 'Generator', value: 'Hugging Face FLUX.1' },
        { trait_type: 'Style', value: 'Pixel Art' },
        ...(fid ? [{ trait_type: 'FID', value: String(fid) }] : []),
        ...(username ? [{ trait_type: 'Creator', value: `@${username}` }] : []),
      ],
    };

    // 4) رفع الميتاداتا نفسها إلى IPFS
    const metadataUri = await storage.upload(metadata); // => ipfs://...

    // 5) رجّع URI للواجهة (هي غادي تدير mintTo(address, metadataUri))
    return NextResponse.json({ metadataUri });
  } catch (e: any) {
    console.error('create-signed-mint error:', e);
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status: 500 }
    );
  }
}
