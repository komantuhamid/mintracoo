import { NextResponse } from 'next/server';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import { ethers } from 'ethers';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // نقبل الأسماء الجديدة + القديمة باش مانطيّحوش "Missing address"
    const address: string = body.address || body.wallet_address;
    const imageUrl: string = body.imageUrl || body.image_url;

    if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    if (!imageUrl) return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });

    const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY!;
    const contractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT!;
    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453); // 8453 Base mainnet
    const rpcEnv = process.env.NEXT_PUBLIC_RPC_URL;

    if (!privateKey || !contractAddress) {
      return NextResponse.json(
        { error: 'Missing env: THIRDWEB_ADMIN_PRIVATE_KEY or NEXT_PUBLIC_NFT_CONTRACT' },
        { status: 500 },
      );
    }

    // v4: rpc خاصها تكون string[]
    const fallbackRpc = chainId === 84532 ? 'https://sepolia.base.org' : 'https://mainnet.base.org';
    const chain = {
      name: chainId === 84532 ? 'base-sepolia' : 'base',
      chainId,
      rpc: [rpcEnv || fallbackRpc],
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      shortName: chainId === 84532 ? 'basesep' : 'base',
      slug: chainId === 84532 ? 'base-sepolia' : 'base',
      testnet: chainId === 84532,
    };

    const sdk = ThirdwebSDK.fromPrivateKey(privateKey, chain);
    const contract = await sdk.getContract(contractAddress);

    // الثمن (string) – thirdweb كيحوّلو داخليًا
    const mintPriceEth = '0.0001';
    const priceWei = ethers.utils.parseEther(mintPriceEth).toString();
    const currency = ethers.constants.AddressZero; // native ETH

    const payload = {
      to: address,
      metadata: {
        name: 'Raccoon Pixel Art',
        description: 'Raccoon NFT generated via MiniApp',
        image: imageUrl,
      },
      price: mintPriceEth,
      currency,
      mintStartTime: new Date(),
      mintEndTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      primarySaleRecipient: address,
    };

    const signed = await contract.erc721.signature.generate(payload);

    return NextResponse.json(
      {
        mintRequest: signed.payload, // struct
        signature: signed.signature, // 0x…
        contractAddress,
        chainId,
        priceWei,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error('Mint sign error:', err);
    return NextResponse.json(
      { error: err?.message || 'Error creating mint request' },
      { status: 500 },
    );
  }
}
