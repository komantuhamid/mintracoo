export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

const STYLE_REFERENCE_URL =
  "https://up6.cc/2025/10/176307007680191.png";

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
];

const SKIN_TONES = [
  "fair light skin",
  "medium tan skin",
  "brown skin",
  "dark brown skin",
  "olive skin",
  "deep skin"
];

const EYE_COLORS = [
  "brown eyes",
  "blue eyes",
  "green eyes",
  "hazel eyes",
  "gray eyes",
  "amber eyes"
];

const HAIRSTYLES = [
  "short slicked back hair",
  "curly afro hair",
  "long flowing hair",
  "wavy shoulder length hair",
  "buzz cut short hair",
  "dreadlocks hair",
  "man bun hair",
  "pompadour styled hair",
  "messy textured hair",
  "side part hair",
  "undercut fade hair",
  "mohawk styled hair",
  "bald shaved head",
  "short curly hair",
  "long straight hair",
  "bob cut hair",
  "pixie cut short hair",
  "braided hair",
  "ponytail hair",
  "vintage waves hair"
];

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
  "cowboy hat"
];

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
  "oversized sunglasses"
];

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
  "flannel shirt"
];

const ACCESSORIES = [
  "no accessory",
  "necktie striped",
  "bow tie",
  "scarf wrapped",
  "chain necklace",
  "pendant necklace",
  "choker necklace",
  "bandana",
  "collar pin"
];

const SPECIAL_FEATURES = [
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
  "facial piercings multiple"
];

const EXPRESSIONS = [
  "confident smirk",
  "serious intense look",
  "friendly smile",
  "cool relaxed expression",
  "smug grin",
  "determined look",
  "mysterious expression",
  "playful smirk",
  "contemplative look"
];

function getPersonalizedBackground(fid: number): string {
  return BACKGROUND_COLORS[fid % BACKGROUND_COLORS.length];
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function buildPrompt(bgHint?: string) {
  const background = bgHint || getRandomElement(BACKGROUND_COLORS);
  const skinTone = getRandomElement(SKIN_TONES);
  const eyeColor = getRandomElement(EYE_COLORS);
  const hairstyle = getRandomElement(HAIRSTYLES);
  const headwear = getRandomElement(HEADWEAR);
  const eyewear = getRandomElement(EYEWEAR);
  const clothing = getRandomElement(CLOTHING);
  const accessory = getRandomElement(ACCESSORIES);
  const special = getRandomElement(SPECIAL_FEATURES);
  const expression = getRandomElement(EXPRESSIONS);

  // 🔥 PROMPT: let art reference do the heavy lifting!
  const prompt = `NFT character portrait, ${skinTone}, ${eyeColor}, ${hairstyle}, ${headwear !== "no hat" ? headwear : ""}, ${eyewear !== "no glasses" ? eyewear : ""}, ${expression}, wearing ${clothing}, ${accessory !== "no accessory" ? accessory : ""}, ${special !== "normal" ? special : ""}, ${background} background, exact same art style as reference image, same composition, same thick outlines, same cel shading, same texture, professional NFT artwork`;

  const negative = "full body, legs visible, feet showing, hands in frame, realistic photo, 3D render, blurry, low quality, deformed, multiple people, text, watermark, different art style, smooth cartoon, anime style, different composition, plain background, no texture";

  return { prompt, negative };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fid = body?.fid;

    let selectedBackground: string | undefined;

    if (fid && typeof fid === 'number') {
      selectedBackground = getPersonalizedBackground(fid);
      console.log("✅ Using FID-based background:", selectedBackground);
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Missing REPLICATE_API_TOKEN" },
        { status: 500 }
      );
    }

    const { prompt, negative } = buildPrompt(selectedBackground);

    console.log("🎨 Generating Mad Lads Style NFT with Reference Image...");

    // 🔥 USE STYLE_REFERENCE_URL AS STYLE GUIDE
    const output: any = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          image: STYLE_REFERENCE_URL, // 🔥 Always Mad Lads style!
          prompt: prompt,
          negative_prompt: negative,
          prompt_strength: 0.60,
          num_inference_steps: 50,
          width: 1024,
          height: 1024,
          guidance_scale: 7.5,
          scheduler: "K_EULER_ANCESTRAL",
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
    });
  } catch (e: any) {
    console.error("Route error:", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
