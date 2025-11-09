import { NextRequest, NextResponse } from "next/server";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { ThirdwebStorage } from "@thirdweb-dev/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT!;
const CHAIN = "base"; // Base chain id = 8453

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
    if (!process.env.SIGNER_PRIVATE_KEY)
      return NextResponse.json({ error: "Missing SIGNER_PRIVATE_KEY" }, { status: 500 });

    // 1️⃣ جلب الصورة من Hugging Face
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Failed to fetch generated image");
    const nodeBuffer = Buffer.from(await imgRes.arrayBuffer());

    // 2️⃣ رفع الصورة لـ IPFS
    const ipfsImageUri = await storage.upload(nodeBuffer, { uploadWithoutDirectory: true });

    // 3️⃣ بناء metadata
    const name =
      username && username.trim() ? `Raccoon • @${username}` : "Raccoon";
    const description = `AI-generated pixel raccoon NFT for ${address}${
      fid ? ` (FID ${fid})` : ""
    }`;

    const attributes = [
      { trait_type: "Generator", value: "Hugging Face FLUX.1" },
      { trait_type: "Style", value: "Pixel Art" },
      ...(fid ? [{ trait_type: "FID", value: String(fid) }] : []),
      ...(username ? [{ trait_type: "Creator", value: `@${username}` }] : []),
    ];

    // 4️⃣ تهيئة SDK بالمفتاح الخاص لمحفظة السيرفر
    const sdk = ThirdwebSDK.fromPrivateKey(process.env.SIGNER_PRIVATE_KEY!, CHAIN, {
      secretKey: process.env.THIRDWEB_SECRET_KEY,
    });
    const contract = await sdk.getContract(CONTRACT_ADDRESS);

    // 5️⃣ إنشاء توقيع mint
    const signed = await contract.erc721.signature.generate({
      to: address,
      price: 0,
      metadata: { name, description, image: ipfsImageUri, attributes },
    });

    // 6️⃣ إعداد بيانات المعاملة للواجهة
    const to = await contract.getAddress();
    const data = contract.encoder.encode("mintWithSignature", [
      signed.payload,
      signed.signature as `0x${string}`,
    ]);

    return NextResponse.json({ to, data, value: "0" });
  } catch (e: any) {
    console.error("create-signed-mint error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
