export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

// 🎨 BACKGROUND COLORS - Textured vintage style
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
  "turquoise blue vintage textured"
];

// 👤 SKIN TONES
const SKIN_TONES = [
  "fair light skin",
  "medium tan skin",
  "brown skin",
  "dark brown skin",
  "olive skin",
  "deep skin"
];

// 👁️ EYE COLORS
const EYE_COLORS = [
  "brown eyes",
  "blue eyes",
  "green eyes",
  "hazel eyes",
  "gray eyes",
  "amber eyes"
];

// 💇 HAIRSTYLES
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

// 🎩 HEADWEAR
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

// 👓 EYEWEAR
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

// 👔 CLOTHING
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

// 📿 ACCESSORIES
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

// 🎨 SPECIAL FEATURES (rare traits)
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

// 😎 EXPRESSIONS
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

  // 🔥 MAD LADS STYLE PROMPT
  const prompt = `professional NFT character portrait artwork, stylish fashionable person, ${skinTone} tone, ${eyeColor}, ${hairstyle}, ${headwear !== "no hat" ? "wearing " + headwear : ""}, ${eyewear !== "no glasses" ? "wearing " + eyewear : ""}, ${expression} facial expression, wearing ${clothing}, ${accessory !== "no accessory" ? accessory : ""}, ${special !== "normal" ? special : ""}, head and shoulders portrait composition, front-facing view, ${background} background with vintage paper texture and subtle brush strokes, clean comic book art style, thick black outlines, cel shaded illustration, professional digital artwork, Mad Lads NFT aesthetic, trendy urban fashion character design, collectible NFT art quality`;

  const negative = `full body, legs, feet, hands visible, realistic photo, photorealistic, 3D render, blurry, low quality, deformed, bad anatomy, multiple people, crowd, text, watermark, logo, side view, back view, cute chibi, cartoon blob, rounded features, baby face, childish, smooth gradient background, plain solid color background, no texture, goblin, monster, creature, animal ears`;

  return { prompt, negative };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fid = body?.fid;
    const pfpUrl = body?.pfpUrl;
    
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
    console.log("🎨 Generating Mad Lads Style NFT...");

    let output: any;

    if (pfpUrl) {
      console.log("🖼️ Using PFP for character reference:", pfpUrl);
      
      output = await replicate.run(
        "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        {
          input: {
            image: pfpUrl,
            prompt: prompt,
            negative_prompt: negative,
            prompt_strength: 0.75,  // Medium strength - keeps some PFP features
            num_inference_steps: 50,
            width: 1024,
            height: 1024,
            guidance_scale: 8.0,
            scheduler: "K_EULER_ANCESTRAL",
          }
        }
      );
    } else {
      console.log("🎨 Generating from scratch");
      
      output = await replicate.run(
        "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        {
          input: {
            prompt: prompt,
            negative_prompt: negative,
            num_inference_steps: 50,
            width: 1024,
            height: 1024,
            guidance_scale: 7.5,
            scheduler: "K_EULER_ANCESTRAL",
          }
        }
      );
    }

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
      success: true
    });
  } catch (e: any) {
    console.error("Route error:", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
