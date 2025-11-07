import { NextResponse } from "next/server";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { address, imageUrl } = body;

    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }
    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY!;
    const contractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT!;
    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453); // 8453 Base mainnet, 84532 Base Sepolia
    const rpcEnv = process.env.NEXT_PUBLIC_RPC_URL;

    if (!privateKey || !contractAddress) {
      return NextResponse.json(
        { error: "Missing env vars: THIRDWEB_ADMIN_PRIVATE_KEY or NEXT_PUBLIC_NFT_CONTRACT" },
        { status: 500 }
      );
    }

    // ✔ تعريف الشبكة بصيغة v4: rpc لازم تكون string[]
    const fallbackRpc = chainId === 84532 ? "https://sepolia.base.org" : "https://mainnet.base.org";
    const chain = {
      name: chainId === 84532 ? "base-sepolia" : "base",
      chainId,
      rpc: [rpcEnv || fallbackRpc], // ← مصفوفة
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      shortName: chainId === 84532 ? "basesep" : "base",
      slug: chainId === 84532 ? "base-sepolia" : "base",
      testnet: chainId === 84532,
    };

    // إنشاء SDK من private key والشبكة (v4)
    const sdk = ThirdwebSDK.fromPrivateKey(privateKey, chain);

    const contract = await sdk.getContract(contractAddress);

    // الثمن بالـ ETH كـ string (v4 يتكفّل بالتحويل)
    const mintPrice = "0.0001";
    const currency = ethers.constants.AddressZero; // native ETH

    const payload = {
      to: address,
      metadata: {
        name: "Raccoon Pixel Art",
        description: "Raccoon NFT generated via MiniApp",
        image: imageUrl,
      },
      price: mintPrice,
      currency,
      mintStartTime: new Date(),
      mintEndTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // +1 سنة
      primarySaleRecipient: address,
    };

    // التوقيع (v4)
    const signedPayload = await contract.erc721.signature.generate(payload);

    return NextResponse.json(
      {
        mintRequest: signedPayload.payload,
        signature: signedPayload.signature,
        contractAddress,
        chainId,
        priceWei: ethers.utils.parseEther(mintPrice).toString(),
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Mint sign error:", err);
    return NextResponse.json(
      { error: err?.message || "Error creating mint request" },
      { status: 500 }
    );
  }
}
