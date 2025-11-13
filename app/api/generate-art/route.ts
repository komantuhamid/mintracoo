export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

// 🔥 REFERENCE IMAGE - Mad Lads style
const STYLE_REFERENCE_URL = "https://up6.cc/2025/10/176307007680191.png";

// 🎨 BACKGROUND COLORS (random each time)
const BACKGROUND_COLORS = [
  "coral red vintage textured",
  "sky blue vintage textured",
  "cream beige vintage textured",
  "soft pink vintage textured",
  "mint green vintage textured",
  "lavender purple vintage textured",
  "warm orange vintage textured",
  "powder blue vintage textured",
  "rose pink vintage textured",
  "sage green vintage textured",
  "peach orange vintage textured",
  "turquoise blue vintage textured",
  "sunset orange vintage textured",
  "forest green vintage textured",
  "royal purple vintage textured",
  "salmon pink vintage textured"
];

// 🎩 HEADWEAR (random each time)
const HEADWEAR = [
  "no hat",
  "vintage fedora hat",
  "newsboy cap",
  "beanie knit cap",
  "baseball cap",
  "bucket hat",
  "beret",
  "wide brim hat",
  "snapback cap",
  "trucker hat",
  "bowler hat",
  "flat cap",
  "panama hat",
  "cowboy hat",
  "top hat",
  "straw hat",
  "bandana headband"
];

// 👓 EYEWEAR (random each time)
const EYEWEAR = [
  "no glasses",
  "round frame glasses",
  "aviator sunglasses",
  "wayfarer sunglasses",
  "cat-eye glasses",
  "rectangular glasses",
  "vintage round sunglasses",
  "steampunk goggles",
  "futuristic visor",
  "heart-shaped glasses",
  "oversized sunglasses",
  "rimless glasses",
  "thick frame glasses"
];

// 👔 CLOTHING (random each time)
const CLOTHING = [
  "pinstripe suit jacket",
  "leather jacket",
  "denim jacket",
  "bomber jacket",
  "blazer jacket",
  "trench coat",
  "hoodie casual",
  "turtleneck sweater",
  "button-up shirt",
  "polo shirt",
  "graphic t-shirt",
  "vintage vest",
  "cardigan sweater",
  "military jacket",
  "varsity jacket",
  "windbreaker",
  "track jacket",
  "flannel shirt",
  "dress shirt",
  "hawaiian shirt",
  "sweater vest",
  "peacoat"
];

// 📿 ACCESSORIES (random each time)
const ACCESSORIES = [
  "no accessory",
  "necktie striped",
  "bow tie",
  "scarf wrapped",
  "chain necklace",
  "pendant necklace",
  "choker necklace",
  "bandana",
  "collar pin",
  "pocket square",
  "suspenders",
  "tie clip"
];

// 🎨 SPECIAL FEATURES (random each time)
const SPECIAL_FEATURES = [
  "normal",
  "normal",
  "normal",
  "normal",
  "normal",
  "normal",
  "normal",
  "normal",
  "face tattoos small",
  "septum piercing",
  "nose ring",
  "ear gauges",
  "facial piercings multiple",
  "beauty mark",
  "freckles"
];

// 🔥 Fetch Farcaster PFP
async function fetchFarcasterPFP(fid: number): Promise<string | null> {
  try {
    const response = await fetch(`https://client.warpcast.com/v2/user-by-fid?fid=${fid}`);
    const data = await response.json();
    return data?.result?.user?.pfp?.url || null;
  } catch (error) {
    console.error("Failed to fetch Farcaster PFP:", error);
    return null;
  }
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function buildPrompt() {
  // 🔥 RANDOM traits every time!
  const background = getRandomElement(BACKGROUND_COLORS);
  const headwear = getRandomElement(HEADWEAR);
  const eyewear = getRandomElement(EYEWEAR);
  const clothing = getRandomElement(CLOTHING);
  const accessory = getRandomElement(ACCESSORIES);
  const special = getRandomElement(SPECIAL_FEATURES);

  const prompt = `NFT portrait character in Mad Lads comic book art style, ${headwear !== "no hat" ? "wearing " + headwear : ""}, ${eyewear !== "no glasses" ? "wearing " + eyewear : ""}, wearing ${clothing}, ${accessory !== "no accessory" ? accessory : ""}, ${special !== "normal" ? special : ""}, ${background} background with vintage paper texture, thick black outlines, cel shaded illustration, head and shoulders portrait, front facing, professional NFT artwork`;

  const negative = "different face structure, different facial proportions, different bone structure, changing face shape, full body, legs visible, feet showing, hands in frame, realistic photo, 3D render, blurry, low quality, deformed, multiple people, text, watermark, different art style, smooth cartoon, plain background, no texture";

  return { prompt, negative, traits: { background, headwear, eyewear, clothing, accessory, special } };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fid = body?.fid;
    
    if (!fid || typeof fid !== 'number') {
      return NextResponse.json(
        { error: "FID required" },
        { status: 400 }
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Missing REPLICATE_API_TOKEN" },
        { status: 500 }
      );
    }

    // 🔥 AUTO-FETCH Farcaster PFP
    console.log("📡 Fetching Farcaster PFP for FID:", fid);
    const pfpUrl = await fetchFarcasterPFP(fid);
    
    if (!pfpUrl) {
      return NextResponse.json(
        { error: "Could not fetch Farcaster PFP" },
        { status: 404 }
      );
    }

    console.log("✅ Got PFP:", pfpUrl);

    // 🔥 RANDOM traits each generation
    const { prompt, negative, traits } = buildPrompt();

    console.log("🎨 Generating Mad Lads NFT with random traits...");
    console.log("Traits:", traits);

    // 🔥 Use PFP to preserve FACE STRUCTURE
    const output: any = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          image: pfpUrl,
          prompt: `transform this person into Mad Lads NFT art style, preserve exact face structure and facial proportions, keep same face shape, ${prompt}`,
          negative_prompt: negative,
          prompt_strength: 0.35,  // 🔥 VERY LOW = locks face structure!
          num_inference_steps: 50,
          width: 1024,
          height: 1024,
          guidance_scale: 7.0,
          scheduler: "K_EULER_ANCESTRAL",
          seed: fid,  // 🔥 Same seed per user = same face base
        }
      }
    );

    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch generated image: ${imageResponse.status}` },
        { status: 502 }
      );
    }

    const imgBuf = Buffer.from(await imageResponse.arrayBuffer());
    const dataUrl = `data:image/png;base64,${imgBuf.toString("base64")}`;

    return NextResponse.json({
      generated_image_url: dataUrl,
      imageUrl: dataUrl,
      success: true,
      traits: traits,
      pfpUrl: pfpUrl,  // Return PFP so frontend knows it worked
    });

  } catch (e: any) {
    console.error("Route error:", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
