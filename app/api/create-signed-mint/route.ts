import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';

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
        { status: 500 },
      );
    }

    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453);
    const contractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT as `0x${string}`;
    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_NFT_CONTRACT' },
        { status: 500 },
      );
    }

    // Thirdweb credentials (SERVER envs)
    const clientId =
      process.env.THIRDWEB_CLIENT_ID ||
      process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ||
      '';
    const secretKey = process.env.THIRDWEB_SECRET_KEY || '';

    if (!clientId && !secretKey) {
      return NextResponse.json(
        {
          error:
            'Missing Thirdweb credentials: set THIRDWEB_CLIENT_ID (recommended) or THIRDWEB_SECRET_KEY in your server env.',
        },
        { status: 500 },
      );
    }

    // ***** إنشاء الـ SDK: الوسيط الثاني chainId فقط، والثالث options فيه clientId/secretKey
    const sdk = ThirdwebSDK.fromPrivateKey(privateKey, chainId, {
      clientId: clientId || undefined,
      secretKey: secretKey || undefined,
      // بإمكانك تحديد RPC مخصص عبر supportedChains إذا بغيتي:
      // supportedChains: [{ chainId, rpc: [process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'], nativeCurrency: { name:'Ether', symbol:'ETH', decimals:18 }, slug:'base' }]
    });

    const storage = sdk.storage;

    // 1) تنزيل الصورة من URL ثم رفعها إلى IPFS عبر storage (كيضيف x-client-id تلقائياً)
    const got = await fetch(imageUrl);
    if (!got.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${got.status}` },
        { status: 400 },
      );
    }
    const imgBlob = await got.blob();
    const file = new File([imgBlob], `raccoon_${Date.now()}.png`, {
      type: imgBlob.type || 'image/png',
    });

    const imageCid = await storage.upload(file);
    const imageIpfs = storage.resolveScheme(imageCid);

    // 2) رفع Metadata
    const metadata = {
      name: `Raccoon Pixel #${Math.floor(Math.random() * 999999)}`,
      description: `Raccoon pixel art generated for @${username || ''} (fid:${fid || ''})`,
      image: imageIpfs,
      attributes: [{ trait_type: 'Generator', value: 'MiniApp' }],
    };
    const metaCid = await storage.upload(metadata);
    const tokenURI = storage.resolveScheme(metaCid);

    // 3) إنشاء توقيع mintWithSignature (TokenERC721 signature mint)
    const contract = await sdk.getContract(contractAddress);

    const priceWei = '100000000000000'; // 0.0001 ETH
    const start = Math.floor(Date.now() / 1000) - 60;
    const end = start + 60 * 60 * 24 * 365;

    const uid =
      ('0x' +
        Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')) as `0x${string}`;

    const mintRequest = {
      to: address,
      royaltyRecipient: address,
      royaltyBps: 0,
      primarySaleRecipient: address,
      uri: tokenURI,
      price: priceWei,
      currency: '0x0000000000000000000000000000000000000000',
      validityStartTimestamp: start,
      validityEndTimestamp: end,
      uid,
    };

    const { signature } = await (contract as any).signature.generate(mintRequest);

    return NextResponse.json({
      mintRequest,
      signature,
      priceWei,
      image: imageIpfs,
      metadata: tokenURI,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
