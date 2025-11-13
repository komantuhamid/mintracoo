export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Runware, IImageInference } from "@runware/sdk-js";

const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY || "";

const GOBLIN_COLOR_SCHEMES = [
  { skin: "bright lime green", bg: "soft cream" },
  { skin: "dark forest green", bg: "soft gray" },
  { skin: "mint green", bg: "pale blue" },
  { skin: "cobalt blue", bg: "soft cream" },
  { skin: "navy blue", bg: "light gray" },
  { skin: "violet purple", bg: "soft beige" },
  { skin: "crimson red", bg: "soft gray" },
  { skin: "golden yellow", bg: "soft gray" },
  { skin: "hot pink", bg: "light gray" },
  { skin: "neon green", bg: "dark charcoal" }
];

const HEAD_ITEMS = ["wizard hat", "party hat", "crown", "cap", "beanie"];
const EYE_ITEMS = ["big eyes", "sunglasses", "goggles", "happy eyes"];
const MOUTH_ITEMS = ["big grin", "fangs", "smile"];
const CLOTHING = ["robe", "vest", "armor", "cape"];
const HAND_ITEMS = ["sword", "staff", "torch", "nothing"];

function getPersonalizedColor(fid: number) {
  return GOBLIN_COLOR_SCHEMES[fid % GOBLIN_COLOR_SCHEMES.length];
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fid = body?.fid || 0;
    
    if (!RUNWARE_API_KEY) {
      return NextResponse.json({ error: "Missing Runware API key" }, { status: 500 });
    }

    const color = getPersonalizedColor(fid);
    const headItem = getRandomElement(HEAD_ITEMS);
    const eyeItem = getRandomElement(EYE_ITEMS);
    const mouthItem = getRandomElement(MOUTH_ITEMS);
    const clothing = getRandomElement(CLOTHING);
    const handItem = getRandomElement(HAND_ITEMS);

    const prompt = `flat 2D cartoon goblin character, ${color.skin} skin, wearing ${headItem}, ${eyeItem}, ${mouthItem}, wearing ${clothing}, holding ${handItem}, ${color.bg} background, simple flat style, centered`;
    
    console.log("🎨 Generating with Runware...");

    const runware = new Runware({ apiKey: RUNWARE_API_KEY });
    await runware.connect();

    const imageRequest: IImageInference = {
      positivePrompt: prompt,
      model: "runware:100@1",
      width: 1024,
      height: 1024,
      numberResults: 1,
      outputFormat: "WEBP",
      outputType: "base64Data"
    };

    const images = await runware.requestImages(imageRequest);
    
    if (!images || images.length === 0) {
      throw new Error("No images generated");
    }

    const imageData = images.imageBase64Data;
    const dataUrl = `data:image/webp;base64,${imageData}`;

    console.log("✅ Success!");

    return NextResponse.json({
      generated_image_url: dataUrl,
      imageUrl: dataUrl,
      success: true
    });

  } catch (e: any) {
    console.error("❌ Error:", e.message);
    return NextResponse.json({ 
      error: e?.message || "server_error" 
    }, { status: 500 });
  }
}

