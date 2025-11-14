export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

const STYLE_REFERENCE_URL = "https://up6.cc/2025/10/176307007680191.png";

const BACKGROUND_COLORS = [
  "coral red vintage textured","sky blue vintage textured","cream beige vintage textured",
  "soft pink vintage textured","mint green vintage textured","lavender purple vintage textured",
  "warm orange vintage textured","powder blue vintage textured","rose pink vintage textured",
  "sage green vintage textured","peach orange vintage textured","turquoise blue vintage textured"
];
const SKIN_TONES = [
  "fair light skin", "medium tan skin", "brown skin", "dark brown skin", "olive skin", "deep skin"
];
const EYE_COLORS = [
  "brown eyes","blue eyes","green eyes","hazel eyes","gray eyes","amber eyes"
];
const HAIRSTYLES = [
  "short slicked back hair","curly afro hair","long flowing hair","wavy shoulder length hair",
  "buzz cut short hair","dreadlocks hair","man bun hair","pompadour styled hair","messy textured hair",
  "side part hair","undercut fade hair","mohawk styled hair","bald shaved head","short curly hair",
  "long straight hair","bob cut hair","pixie cut short hair","braided hair","ponytail hair","vintage waves hair"
];
const HEADWEAR = [
  "no hat","vintage fedora hat","newsboy cap","beanie knit cap","baseball cap","bucket hat",
  "beret","wide brim hat","snapback cap","trucker hat","bowler hat","flat cap","panama hat","cowboy hat"
];
const EYEWEAR = [
  "no glasses","round frame glasses","aviator sunglasses","wayfarer sunglasses","cat-eye glasses",
  "rectangular glasses","vintage round sunglasses","steampunk goggles","futuristic visor","heart-shaped glasses","oversized sunglasses"
];
const CLOTHING = [
  "pinstripe suit jacket","leather jacket","denim jacket","bomber jacket","blazer jacket",
  "trench coat","hoodie casual","turtleneck sweater","button-up shirt","polo shirt",
  "graphic t-shirt","vintage vest","cardigan sweater","military jacket","varsity jacket",
  "windbreaker","track jacket","flannel shirt"
];
const ACCESSORIES = [
  "no accessory","necktie striped","bow tie","scarf wrapped","chain necklace",
  "pendant necklace","choker necklace","bandana","collar pin"
];
const SPECIAL_FEATURES = [
  "normal","normal","normal","normal","normal","normal",
  "face tattoos small","septum piercing","nose ring","ear gauges","facial piercings multiple"
];
const EXPRESSIONS = [
  "confident smirk","serious intense look","friendly smile","cool relaxed expression","smug grin",
  "determined look","mysterious expression","playful smirk","contemplative look"
];

function getPersonalizedBackground(fid: number): string {
  return BACKGROUND_COLORS[fid % BACKGROUND_COLORS.length];
}
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// ====== KEY PART: Extract traits from PFP url/filename ======
function extractTraitsFromPfpUrl(pfpUrl: string) {
  const traits: Record<string, string> = {};
  if (!pfpUrl) return traits;
  const lower = pfpUrl.toLowerCase();
  if (lower.includes("blue")) traits.skinTone = "fair light skin";
  if (lower.includes("brown")) traits.skinTone = "brown skin";
  if (lower.includes("dark")) traits.skinTone = "dark brown skin";
  if (lower.includes("hat")) traits.headwear = "baseball cap";
  if (lower.includes("beanie")) traits.headwear = "beanie knit cap";
  if (lower.includes("fedora")) traits.headwear = "vintage fedora hat";
  if (lower.includes("glasses")) traits.eyewear = "aviator sunglasses";
  if (lower.includes("sunglasses")) traits.eyewear = "aviator sunglasses";
  if (lower.includes("scarf")) traits.accessory = "scarf wrapped";
  if (lower.includes("smile")) traits.expression = "friendly smile";
  if (lower.includes("grin")) traits.expression = "smug grin";
  // Add more rules as needed!
  return traits;
}

function buildPrompt(bgHint?: string, pfpTraits?: Record<string, string>) {
  const background = bgHint || getRandomElement(BACKGROUND_COLORS);
  const skinTone = pfpTraits?.skinTone || getRandomElement(SKIN_TONES);
  const eyeColor = pfpTraits?.eyeColor || getRandomElement(EYE_COLORS);
  const hairstyle = pfpTraits?.hairstyle || getRandomElement(HAIRSTYLES);
  const headwear = pfpTraits?.headwear || getRandomElement(HEADWEAR);
  const eyewear = pfpTraits?.eyewear || getRandomElement(EYEWEAR);
  const clothing = pfpTraits?.clothing || getRandomElement(CLOTHING);
  const accessory = pfpTraits?.accessory || getRandomElement(ACCESSORIES);
  const special = pfpTraits?.special || getRandomElement(SPECIAL_FEATURES);
  const expression = pfpTraits?.expression || getRandomElement(EXPRESSIONS);

  const prompt = `NFT character portrait, ${skinTone}, ${eyeColor}, ${hairstyle}, ${headwear !== "no hat" ? headwear : ""}, ${eyewear !== "no glasses" ? eyewear : ""}, ${expression}, wearing ${clothing}, ${accessory !== "no accessory" ? accessory : ""}, ${special !== "normal" ? special : ""}, ${background} background, exact same art style as reference image, same composition, same thick outlines, same cel shading, same texture, professional NFT artwork`;
  const negative = "full body, legs visible, feet showing, hands in frame, realistic photo, 3D render, blurry, low quality, deformed, multiple people, text, watermark, different art style, smooth cartoon, anime style, different composition, plain background, no texture";

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
    }

    const pfpTraits = pfpUrl ? extractTraitsFromPfpUrl(pfpUrl) : undefined;
    const { prompt, negative } = buildPrompt(selectedBackground, pfpTraits);

    const output: any = await replicate.run(
      "stability-ai/sdxl:latest", // Or your preferred version for Mad Lads
      {
        input: {
          prompt: prompt,
          negative_prompt: negative,
          width: 1024,
          height: 1024,
          num_inference_steps: 50,
          guidance_scale: 7.5,
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
      success: true
    });
  } catch (e: any) {
    console.error("Route error:", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
