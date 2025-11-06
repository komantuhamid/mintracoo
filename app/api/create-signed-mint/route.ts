import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, RPC_URL } from '@/lib/chains';

const MINTER_PK = process.env.MINTER_PRIVATE_KEY!;
const MAX_SUPPLY = 5000n;
const PRICE_ETH = '0.0001';

export async function POST(req: Request) {
  try {
    const { to, image_url, username, fid } = await req.json();
    if (!to || !image_url) return NextResponse.json({ error: 'missing params' }, { status: 400 });
    if (!MINTER_PK) return NextResponse.json({ error: 'Missing MINTER_PRIVATE_KEY' }, { status: 500 });

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(MINTER_PK, provider);

    const abi = [
      'function nextTokenIdToMint() view returns (uint256)',
      'function eip712Domain() view returns (bytes1,string,string,uint256,address,bytes32,uint256[])'
    ];
    const c = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

    const currentSupply: bigint = await c.nextTokenIdToMint();
    if (currentSupply >= MAX_SUPPLY) {
      return NextResponse.json({ error: 'sold_out' }, { status: 403 });
    }

    const metadata = { name: username ? `AI PFP – @${username}` : 'AI PFP', description: fid ? `Farcaster FID ${fid}` : 'Generated PFP', image: image_url };
    const tokenUri = `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`;

    const [, name, version, chainId, verifyingContract] = await c.eip712Domain();
    const domain = { name, version, chainId: Number(chainId), verifyingContract };

    const priceWei = ethers.parseEther(PRICE_ETH);
    const now = Math.floor(Date.now() / 1000);
    const validitySeconds = 60 * 60;

    const mintRequest = {
      to,
      royaltyRecipient: to,
      royaltyBps: 0,
      primarySaleRecipient: to,
      uri: tokenUri,
      price: priceWei,
      currency: ethers.ZeroAddress,
      validityStartTimestamp: BigInt(now),
      validityEndTimestamp: BigInt(now + validitySeconds),
      uid: ethers.hexlify(ethers.randomBytes(32)),
    };

    const types = { MintRequest: [
      { name: 'to', type: 'address' },
      { name: 'royaltyRecipient', type: 'address' },
      { name: 'royaltyBps', type: 'uint256' },
      { name: 'primarySaleRecipient', type: 'address' },
      { name: 'uri', type: 'string' },
      { name: 'price', type: 'uint256' },
      { name: 'currency', type: 'address' },
      { name: 'validityStartTimestamp', type: 'uint128' },
      { name: 'validityEndTimestamp', type: 'uint128' },
      { name: 'uid', type: 'bytes32' }
    ]};

    const signature = await (wallet as any)._signTypedData(domain, types, mintRequest);
    return NextResponse.json({ mintRequest, signature, priceWei: priceWei.toString() });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'server error' }, { status: 500 });
  }
}
