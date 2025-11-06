# Farcaster Mini App – AI PFP Mint (Signed Payload)

- Mini App detection + Wagmi fallback
- Profile via Neynar (server)
- Signed-payload mint (`mintWithSignature`) with price 0.0001 ETH and cap 5000
- User signs & pays gas (Mini App wallet or web wallet)

## Env

Public:
```
NEXT_PUBLIC_NFT_CONTRACT=0xYourContract
NEXT_PUBLIC_CHAIN_ID=8453
```

Server-only:
```
RPC_URL=https://mainnet.base.org
MINTER_PRIVATE_KEY=0x...
NEYNAR_API_KEY=your_neynar_key
```

(Optional) Replace `/api/generate-art` with your generator.

## Run
1. npm i
2. Set envs (Vercel or .env.local)
3. npm run dev


### Replicate
Set `REPLICATE_API_TOKEN` in your env to enable `/api/generate-art`.
