export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import sharp from "sharp";
import ColorThief from "colorthief";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

const BASE_CHARACTER = "round blob goblin creature monster";

const TRAITS = [
  "spiky hair", "glowing eyes", "tiny wings", "striped belly", "freckles", 
  "antenna", "star badge", "bubble helmet", "fangs", "cheek blush", "tail", 
  "patch", "horns", "bandana", "goggles", "baseball cap", "wizard hat"
];

function randomTrait() {
  return TRAITS[Math.floor(Math.random() * TRAITS.length)];
}

async function extractPaletteFromPFP(pfpUrl: string): Promise<string[]> {
  try {
    const res = await fetch(pfpUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const colors = await ColorThief.getPalette(buffer, 4);
    return colors.map(rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
  } catch (e) {
    console.error("Color extraction error:", e);
    // fallback palette
    return ["rgb(100, 200, 150)", "rgb(80, 150, 200)", "rgb(255, 180, 100)", "rgb(200, 100, 200)"];
  }
}

function buildPrompt(palette: string[], trait: string) {
  const mainColor = palette[0];
  const accentColor = palette[1] || palette[0];

  const prompt = [
    "simple flat 2D cartoon illustration, clean vector art style",
    "thick black outlines, bold cartoon lines, simple coloring",
    "absolutely flat shading, NO gradients, NO depth",
    "children's book art style, storybook character",
    "vector graphic flat design, minimalist shading",

    `adorable ${BASE_CHARACTER} with smooth skin`,
    `skin color is ${mainColor}`,
    `accent colors using ${accentColor}`,

    "EXACT BODY DIMENSIONS: chubby oval blob body 400 pixels wide by 450 pixels tall",
    "EXACTLY TWO short stubby legs identical size, each leg 60px tall 30px wide",
    "EXACTLY TWO small rounded arms identical size, each arm 70px long 25px thick",
    "head is round sphere 180px diameter exactly",
    "no muscle definition, soft pillowy cuddly body",

    `wearing ${trait} as unique trait`,
    "large round friendly eyes",
    "wide grinning mouth showing cute fangs",
    "small pointed ears on sides of head",

    "facing directly forward, centered composition",
    "standing upright full body visible, feet on ground",

    // Background matches skin color
    `THE ENTIRE BACKGROUND MUST BE ${mainColor}`,
    `BACKGROUND COLOR IS EXACTLY ${mainColor}`,
    `${mainColor} FILLS THE COMPLETE BACKGROUND`,
    "CRITICAL: background is identical color to character skin",
    "MANDATORY: character and background are SAME EXACT color",
    "background is completely flat solid color",
    "no background shading, no background gradient",
    "monochromatic color scheme background equals character",

    "simple cartoon mascot blob monster character"
  ].join(", ");

  const negative = [
    "3D render, CGI, realistic, photorealistic, detailed",
    "complex shading, dramatic lighting, shadows, depth",
    "gradient shading, soft shading, ambient occlusion",
    "drop shadow, cast shadow, shadow under character",
    "3D lighting, volumetric lighting, rim lighting",
    "detailed texture, fur strands, hair detail",
    "blurry, low quality, messy, sketchy",
    "text, watermark, logo, signature",
    "multiple characters, cropped, background scenery",
    "side view, profile, turned sideways",
    "different body sizes, varying body proportions",
    "muscular, athletic, fit, toned",
    "tall, long limbs, stretched, slender",
    "gradient background, textured backdrop, complex scene",
    "WRONG: different background color, mismatched colors",
    "WRONG: background different from character color",
    "multicolored background, patterned background",
    "white background, black background, gray background"
  ].join(", ");

  return { prompt, negative };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userPfpUrl = body?.pfpUrl || body?.userPfpUrl;

    if (!userPfpUrl) {
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });
    }

    const palette = await extractPaletteFromPFP(userPfpUrl);
    const trait = randomTrait();
    const { prompt, negative } = buildPrompt(palette, trait);

    console.log("🎨 Generating Chubby Monster NFT with PFP colors...");
    console.log("Palette:", palette);
    console.log("Trait:", trait);

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
    if (!imageUrl) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

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
      trait,
      success: true
    });

  } catch (e: any) {
    console.error("Route error:", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
