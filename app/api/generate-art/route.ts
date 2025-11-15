export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import sharp from "sharp";
import ColorThief from "colorthief";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

// Random accessory lists (expand as needed)
const HEAD_ITEMS = [ "wizard hat", "bandana", "spiky helmet", "goggles" ];
const EYE_ITEMS = [ "big round eyes", "glowing eyes", "starry eyes", "striped eyelids" ];
const MOUTH_ITEMS = [ "wide toothy grinning mouth", "fangs", "cute smile" ];
const CLOTHING_ITEMS = [ "bubble vest", "patch jacket", "scarf", "space suit" ];
const EXPRESSIONS = [ "cheek blush", "excited", "silly" ];

// Pick a random item from an array
function rand(arr: string[]) { return arr[Math.floor(Math.random() * arr.length)]; }

// Use pfp image to get top palette colors
async function extractPaletteFromPFP(pfpUrl: string): Promise<string[]> {
  try {
    const res = await fetch(pfpUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const colorThief = new ColorThief();
    const colors = await colorThief.getPalette(buffer, 4);
    return colors.map(rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
  } catch (e) {
    console.error("Color extraction error:", e);
    return [ "rgb(100, 200, 150)", "rgb(80, 150, 200)", "rgb(255, 180, 100)", "rgb(200, 100, 200)" ];
  }
}

function buildPrompt(palette: string[]) {
  const mainColor = palette[0];
  const accentColor = palette[1] || palette[0];
  const eyeColor = palette[2] || accentColor;
  const detailColor = palette[3] || mainColor;

  // Accessories, traits, expressions
  const headTrait = rand(HEAD_ITEMS);
  const eyeTrait = rand(EYE_ITEMS);
  const mouthTrait = rand(MOUTH_ITEMS);
  const clothingTrait = rand(CLOTHING_ITEMS);
  const expressionTrait = rand(EXPRESSIONS);

  // Prompt enforcing color usage, strict matching, no background noise
  const prompt = [
    "ULTRA-FLAT STYLE, simple flat 2D cartoon illustration, clean vector art style, thick black outlines, bold cartoon lines",
    "absolutely flat shading, NO gradients, NO depth, zero dimension, children's book art style",
    "adorable round blob goblin creature monster with smooth skin",
    `skin and body color is ${mainColor}, accent color is ${accentColor}`,
    `big eyes colored ${eyeColor}, extra details in ${detailColor}`,
    `BODY SIZE - 400x450px, chubby oval blob, legs 60x30px, arms 70x25px, round head 180px diameter, all perfectly proportional`,
    `features include: ${headTrait}, ${eyeTrait}, ${mouthTrait}, ${clothingTrait}, expression: ${expressionTrait}`,
    "CENTERED FRONT VIEW, standing upright full body, stubby legs, all features visible, centered composition",
    `ULTRA-ENFORCED BACKGROUND COLOR MATCHING. THE ENTIRE BACKGROUND MUST BE ${mainColor}`,
    `BACKGROUND COLOR IS EXACTLY ${mainColor}. ${mainColor} FILLS THE COMPLETE BACKGROUND.`,
    "CRITICAL: background is identical color to character skin. MANDATORY: character and background are SAME EXACT color.",
    "REQUIRED: perfect monochromatic single-color scheme. NO background shading. NO gradient. NO patterns.",
    "simple cartoon mascot blob monster character, sticker style"
  ].join(", ");

  const negative = [
    "3D render, realistic, photorealistic, detailed, soft shading, dramatic lighting",
    "gradient, texture, drop shadow, cast shadow, shadow under character",
    "multiple characters, cropped, background elements, background scenery, white/black/gray background",
    "side view, profile, turned, different body sizes, muscular, tall, stretched, slender",
    "gradient background, patterned background, fur detail, logo, watermark, text, signature"
  ].join(", ");

  return { prompt, negative };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userPfpUrl = body?.pfpUrl || body?.userPfpUrl;
    if (!userPfpUrl) return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });

    const palette = await extractPaletteFromPFP(userPfpUrl);
    const { prompt, negative } = buildPrompt(palette);

    const output: any = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt,
          negative_prompt: negative,
          num_inference_steps: 40,
          width: 1024,
          height: 1024,
          guidance_scale: 8.5,
          scheduler: "DPMSolverMultistep",
          seed: Math.floor(Math.random() * 1_000_000),
        }
      }
    );

    const imageUrl = Array.isArray(output) ? output[0] : output;
    if (!imageUrl) return NextResponse.json({ error: "No image generated" }, { status: 500 });

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ error: `Fetch failed: ${imageResponse.status}` }, { status: 502 });
    }

    const imgBuf = Buffer.from(await imageResponse.arrayBuffer());
    const croppedBuffer = await sharp(imgBuf).resize(1024, 1024).png().toBuffer();
    const dataUrl = `data:image/png;base64,${croppedBuffer.toString("base64")}`;

    return NextResponse.json({
      generated_image_url: dataUrl,
      imageUrl: dataUrl,
      palette,
      prompt,
      success: true
    });

  } catch (e: any) {
    console.error("Route error:", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
