export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import sharp from "sharp";
import ColorThief from "colorthief";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

const HEAD_ITEMS = ["wizard hat", "bandana", "spiky helmet", "goggles"];
const EYE_ITEMS = ["big round eyes", "glowing eyes", "starry eyes", "striped eyelids"];
const MOUTH_ITEMS = ["wide toothy grinning mouth", "fangs", "cute smile"];
const CLOTHING_ITEMS = ["bubble vest", "patch jacket", "scarf", "space suit"];
const EXPRESSIONS = ["cheek blush", "excited", "silly"];

function rand(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function extractPaletteFromPFP(pfpUrl: string): Promise<string[]> {
  try {
    const res = await fetch(pfpUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const colorThief = new ColorThief();
    const colors = await colorThief.getPalette(buffer, 4);
    return colors.map(
      (rgb) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
    );
  } catch (e) {
    console.error("Color extraction error:", e);
    return [
      "rgb(100, 200, 150)",
      "rgb(80, 150, 200)",
      "rgb(255, 180, 100)",
      "rgb(200, 100, 200)",
    ];
  }
}

function buildPrompt(palette: string[]) {
  const mainColor = palette[0];
  const accentColor = palette[1] || palette[0];
  const eyeColor = palette[2] || accentColor;
  const detailColor = palette[3] || mainColor;

  // random traits
  const headItem = rand(HEAD_ITEMS);
  const eyeItem = rand(EYE_ITEMS);
  const mouthItem = rand(MOUTH_ITEMS);
  const clothing = rand(CLOTHING_ITEMS);
  const expression = rand(EXPRESSIONS);

  // Ultra-detailed fixed-body, anti-random prompt
  const prompt = [
    "ultra-flat simple cartoon 2D, vector art, thick black outlines, clean sticker style",
    "ADORABLE BLOB GOBLIN MASCOT, fixed body template, every NFT has identical base body and face proportions",    
    "🔥 BODY SIZE - SLIGHTLY TALLER (400x450px)",
    "EXACT BODY DIMENSIONS: slightly oval blob body 400 pixels wide by 450 pixels tall",
    "body measures precisely 400px width by 450px height",
    "body is gently oval shape 400x450 pixels maintaining proportions",
    "chubby belly is soft oval exactly 400 wide by 450 tall pixels",
    "body fills 45% of image height consistently",
    "oval torso measures 400 pixels wide by 450 pixels tall EXACT",
    "blob body is standard size 400x450px gentle oval ALWAYS",
    "EXACTLY TWO short stubby legs identical size",
    "each leg measures precisely 60 pixels tall 30 pixels wide",
    "EXACTLY TWO small rounded arms identical size",
    "each arm measures precisely 70 pixels long 25 pixels thick",
    "head is round sphere attached to body top",
    "head measures 180 pixels diameter exactly",
    "no muscle definition, soft pillowy cuddly body",
    "wide short squat stature, roly-poly blob build",
    `${expression} facial expression`,
    "small pointed ears on sides of head",
    `${headItem}`,
    `${eyeItem}`,
    `${mouthItem}`,
    "mouth showing fangs teeth clearly visible",
    `${clothing}`,
    "all accessories in correct anatomical positions",
    "hat on head, eyes on face, mouth on face visible",
    "clothing on body, necklace on neck, weapon in hands",
    "facing directly forward straight ahead toward camera",
    "front view centered symmetrical pose",
    "standing upright full body visible",
    "looking straight at viewer, feet on ground",
    "stubby legs visible, centered composition",
    `skin and background MUST be exactly ${mainColor}, central eyes in ${eyeColor}, accent in ${accentColor}, minor details in ${detailColor}`,
    "collection-wide consistency required, every NFT must match this exact pose, size, and proportions"
  ].join(", ");

  // Ultra-strict negative
  const negative = [
    // Shading/lighting
    "complex shading, dramatic lighting, shadows, depth",
    "gradient shading, soft shading, ambient occlusion",
    "drop shadow, cast shadow, shadow under character",
    "shading at bottom, darkening at edges, vignette",
    "3D lighting, volumetric lighting, rim lighting",
    "depth of field, blur, bokeh, atmospheric perspective",
    "ground shadow, floor reflection, depth effect",
    "dimensional shading, spherical shading, rounded shading",
    "ambient shadows, contact shadows, soft shadows",
    "radial gradient, color gradient in background",
    "detailed texture, fur strands, hair detail, realistic skin",
    "cinematic lighting, photography, studio lighting",
    "painted, brush strokes, oil painting, watercolor",
    "blurry, low quality, messy, sketchy, unfinished",
    "text, watermark, logo, signature, frame, border",
    // Views and poses
    "multiple characters, cropped, background scenery",
    "side view, profile, turned sideways, angled",
    "3/4 view, looking sideways, facing left or right",
    "back view, rear view, turned around, rotated",
    // BODY CONSISTENCY!!
    "different body sizes, varying body proportions",
    "inconsistent body dimensions, irregular body size",
    "body too large, body too small, wrong body size",
    "oversized body, undersized body, mismatched proportions",
    "body bigger than 450 pixels tall, body smaller than 400 pixels wide",
    "body not oval, elongated body, stretched vertically too much",
    "tall body, extremely stretched body, compressed body, squashed body",
    "different leg sizes, uneven legs, asymmetrical legs",
    "one leg bigger, one leg smaller, varying leg length",
    "different arm sizes, uneven arms, asymmetrical arms",
    "one arm bigger, one arm smaller, varying arm length",
    "large head, tiny head, wrong head size, head too big",
    // Muscle and pose
    "muscular, athletic, fit, toned, abs visible",
    "muscle definition, biceps, six pack, defined",
    "tall, long limbs, stretched, slender, lanky",
    "thin, skinny, slim, lean, human proportions",
    // Accessory errors
    "cigar, pipe, smoking, cigarette, tobacco",
    "floating accessories, misplaced items",
    "hat floating, clothing on wrong body part"
  ].join(", ");

  return { prompt, negative };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userPfpUrl = body?.pfpUrl || body?.userPfpUrl;
    if (!userPfpUrl)
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });

    const palette = await extractPaletteFromPFP(userPfpUrl);
    const { prompt, negative } = buildPrompt(palette);

    const output: any = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt,
          negative_prompt: negative,
          image: userPfpUrl,
          num_inference_steps: 40,
          width: 1024,
          height: 1024,
          guidance_scale: 8.5,
          scheduler: "DPMSolverMultistep",
          seed: Math.floor(Math.random() * 1_000_000),
        },
      }
    );

    const imageUrl = Array.isArray(output) ? output[0] : output;
    if (!imageUrl)
      return NextResponse.json({ error: "No image generated" }, { status: 500 });

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Fetch failed: ${imageResponse.status}` },
        { status: 502 }
      );
    }

    const imgBuf = Buffer.from(await imageResponse.arrayBuffer());
    const croppedBuffer = await sharp(imgBuf)
      .resize(1024, 1024)
      .png()
      .toBuffer();
    const dataUrl = `data:image/png;base64,${croppedBuffer.toString("base64")}`;

    return NextResponse.json({
      generated_image_url: dataUrl,
      imageUrl: dataUrl,
      palette,
      prompt,
      success: true,
    });
  } catch (e: any) {
    console.error("Route error:", e);
    return NextResponse.json(
      { error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}
