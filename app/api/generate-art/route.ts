import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import sharp from "sharp";
import ColorThief from "colorthief";

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

// Your actual trait arrays go here (HEAD_ITEMS, EYE_ITEMS, etc.)
// For brevity, abbreviated here
const HEAD_ITEMS = ["wizard hat", "bandana", "spiky helmet"];
const EYE_ITEMS = ["big round eyes", "glowing eyes", "starry eyes"];
const MOUTH_ITEMS = ["wide toothy grinning mouth", "fangs", "cute smile"];
const CLOTHING = ["bubble vest", "patch jacket"];
const NECK_ITEMS = ["gold chain", "leather cord", "none"];
const HAND_ITEMS = ["magic wand", "none"];
const EXPRESSIONS = ["happy", "angry", "excited"];

// Fully deterministic pick for a given key (user ID, trait, etc)
function pickDeterministic(arr: string[], key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % arr.length;
  return arr[Math.abs(hash % arr.length)];
}

async function extractPaletteFromPFP(pfpUrl: string): Promise<string[]> {
  try {
    const res = await fetch(pfpUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const colorThief = new ColorThief();
    const colors = await colorThief.getPalette(buffer, 4);
    return colors.map(rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
  } catch (e) {
    return [
      "rgb(100, 200, 150)",
      "rgb(80, 150, 200)",
      "rgb(255, 180, 100)",
      "rgb(200, 100, 200)"
    ];
  }
}

// Simple seed from user FID or request input for full determinism
function getSeed(key: string): number {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) + hash) + key.charCodeAt(i);
  return Math.abs(hash % 1_000_000);
}

// Main prompt builder
function buildPrompt(palette: string[], picks: any) {
  const mainColor = palette[0];
  const accentColor = palette[1] || palette[0];
  const eyeColor = palette[2] || accentColor;
  const detailColor = palette[3] || mainColor;

  const prompt = [
    "ultra-flat simple, clean 2D cartoon sticker, vector art, thick black lines",
    "body: oval blob, exactly 400px wide by 450px tall, always same pose/proportion",
    "head: round, 180px diameter, top attached, small pointed ears on each side",
    "legs: 2 short/stubby, 60px tall 30px wide, same position every NFT",
    "arms: 2, short, 70px long 25px thick, hanging, symmetric, no gesture",
    `skin/background ${mainColor}, eyes ${eyeColor}, accents ${accentColor}, details ${detailColor}`,
    `${picks.expression} facial expression, well-centered`,
    `${picks.headItem ? picks.headItem + ", centered on head" : ""}`,
    `${picks.eyeItem ? picks.eyeItem + ", centered on eyes" : ""}`,
    `${picks.mouthItem ? picks.mouthItem + ", just below nose" : ""}`,
    `${picks.clothing ? picks.clothing + ", fitted on torso" : ""}`,
    `${picks.neckItem ? picks.neckItem + ", on neck" : ""}`,
    `${picks.handItem ? picks.handItem + ", in right hand" : ""}`,
    "all accessories separated, never overlap, never obscure body, correct place",
    "front view, straight, full body visible"
  ].filter(Boolean).join(", ");

  const negative = [
    "dramatic shading, 3D, messy details, multiple characters, overlapped items",
    "side view, cropped, visual clutter, broken limbs, blurry, sketch"
  ].join(", ");

  return { prompt, negative };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userPfpUrl = body?.pfpUrl || body?.userPfpUrl || "";
    const userId = body?.fid?.toString() || "0"; // or make this whatever string is unique/user-related

    if (!userPfpUrl)
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });

    const palette = await extractPaletteFromPFP(userPfpUrl);

    // Deterministic picks (same traits for same FID/input)
    const picks = {
      headItem: pickDeterministic(HEAD_ITEMS, userId + "HEAD"),
      eyeItem: pickDeterministic(EYE_ITEMS, userId + "EYE"),
      mouthItem: pickDeterministic(MOUTH_ITEMS, userId + "MOUTH"),
      clothing: pickDeterministic(CLOTHING, userId + "CLOTH"),
      neckItem: pickDeterministic(NECK_ITEMS, userId + "NECK"),
      handItem: pickDeterministic(HAND_ITEMS, userId + "HAND"),
      expression: pickDeterministic(EXPRESSIONS, userId + "EXP")
    };

    // Deterministic seed for user's NFT (use userId, or combine with traits as needed)
    const seed = getSeed(userId);

    const { prompt, negative } = buildPrompt(palette, picks);

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
          seed,
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
      traits: picks,
      seed,
      success: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}
