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

    const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY!;
    const contractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT!;
    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453);

    if (!privateKey || !contractAddress) {
      return NextResponse.json(
        { error: "Missing env vars for mint signing" },
        { status: 500 }
      );
    }

    // Initialize SDK
    const sdk = ThirdwebSDK.fromPrivateKey(privateKey, {
      chainId,
      rpc: process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.base.org",
    });

    const contract = await sdk.getContract(contractAddress);

    // Price in ETH
    const mintPrice = "0.0001";
    const currency = ethers.constants.AddressZero; // native ETH

    // Build the payload
    const payload = {
      to: address,
      metadata: {
        name: "Raccoon Pixel Art",
        description: "Raccoon NFT generated on-chain",
        image: imageUrl,
      },
      price: mintPrice,
      currency,
      mintStartTime: new Date(),
      mintEndTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // +1 year
      primarySaleRecipient: address,
    };

    // Sign mint request
    const signedPayload = await contract.erc721.signature.generate(payload);

    return NextResponse.json(
      {
        mintRequest: signedPayload.payload,
        signature: signedPayload.signature,
        contractAddress,
        chainId,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Mint sign error:", err);
    return NextResponse.json(
      { error: err.message || "Error creating mint request" },
      { status: 500 }
    );
  }
}
