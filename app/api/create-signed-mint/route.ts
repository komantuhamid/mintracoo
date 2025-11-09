// app/api/create-signed-mint/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ThirdwebStorage } from "@thirdweb-dev/storage";
import { ThirdwebSDK, NATIVE_TOKEN_ADDRESS } from "@thirdweb-dev/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT!;
const CHAIN = "base"; // Base mainnet

const storage = new ThirdwebStorage({
  secretKey: process.env.THIRDWEB_SECRET_KEY,
  clientId: process.env.THIRDWEB_CLIENT_ID,
});

type Body = {
  address: `0x${string}`;
  imageUrl: string;
  username?: string;
  fid?: number | string;
};

export async function POST(req: NextRequest) {
  try {
    const { address, imageUrl, username, fid } = (await req.json()) as Body;

    if (!address) return NextResponse.json({ error: "Missing address" }, { status: 400 });
    if (!imageUrl) return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    if (!CONTRACT_ADDRESS) return NextResponse.json({ error: "Missing NEXT_PUBLIC_NFT_CONTRACT" }, { status: 500 });
    if (!process.env.SIGNER_PRIVATE_KEY)
      return NextResponse.json({ error: "Missing SIGNER_PRIVATE_KEY" }, { status: 500 });
    if (!process.env.THIRDWEB_SECRET_KEY && !process.env.THIRDWEB_CLIENT_ID)
      return NextResponse.json({ error: "Missing THIRDWEB credentials" }, { status: 500 });

    // 1) حمّل الصورة من Hugging Face كـ Buffer
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Failed to fetch generated image");
    const nodeBuffer = Buffer.from(await imgRes.arrayBuffer());

    // 2) رفع الصورة لـ IPFS
    const ipfsImageUri = await storage.upload(nodeBuffer, {
      uploadWithoutDirectory: true,
    });

    // 3) حضّر حقول الميتاداتا
    const name =
      username && username.trim().length > 0 ? `Raccoon • @${username}` : "Raccoon";
    const description = `AI-generated pixel art raccoon NFT for ${address}${
      fid ? ` (FID ${fid})` : ""
    }`;
    const attributes = [
      { trait_type: "Generator", value: "Hugging Face FLUX.1" },
      { trait_type: "Style", value: "Pixel Art" },
      ...(fid ? [{ trait_type: "FID", value: String(fid) }] : []),
      ...(username ? [{ trait_type: "Creator", value: `@${username}` }] : []),
    ];

    // 4) SDK بمفتاح محفظة السيرفر (اللي عندها MINTER/CREATOR فالعقد)
    const sdk = ThirdwebSDK.fromPrivateKey(process.env.SIGNER_PRIVATE_KEY!, CHAIN, {
      secretKey: process.env.THIRDWEB_SECRET_KEY,
    });
    const contract = await sdk.getContract(CONTRACT_ADDRESS);

    // 5) توليد توقيع mintWithSignature
    // 👇 مهمة: currencyAddress = NATIVE_TOKEN_ADDRESS باش مايبقاش undefined
    const signed = await contract.erc721.signature.generate({
      to: address,
      price: 0,
      currencyAddress: NATIVE_TOKEN_ADDRESS,
      metadata: {
        name,
        description,
        image: ipfsImageUri, // ipfs://...
        attributes,
      },
    });

    // 6) تجهيز calldata للواجهة
    const to = await contract.getAddress();
    const data = contract.encoder.encode("mintWithSignature", [
      signed.payload,
      signed.signature as `0x${string}`,
    ]);

    // (اختياري) يمكن ترجع metadataUri من payload إذا بغيتي
    // const metadataUri = signed.payload.uri;

    return NextResponse.json({
      to,
      data,
      value: "0",
      // metadataUri,
    });
  } catch (e: any) {
    console.error("create-signed-mint error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
