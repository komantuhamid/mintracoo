import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import sharp from "sharp";
import ColorThief from "colorthief";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

// Use only safe trait texts!
const HEAD_ITEMS = ["blue wizard hat", "green bandana", "striped beanie"];
const EYE_ITEMS = ["big eyes", "glasses", "star eyes"];
const MOUTH_ITEMS = ["happy smile", "closed mouth smile", "small grin"];
const CLOTHING = ["striped shirt", "jacket", "plain white tee"];
const NECK_ITEMS = ["scarf", "bowtie", "necklace"];
const HAND_ITEMS = ["holding paintbrush", "holding flower", "waving hand"];
const EXPRESSIONS = ["excited", "calm", "proud"];

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
      "rgb(80, 170, 220)",
      "rgb(255, 180, 100)",
      "rgb(200, 100, 200)",
      "rgb(150, 200, 150)"
    ];
  }
}

function getSeed(key: string): number {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) + hash) + key.charCodeAt(i);
  return Math.abs(hash % 1_000_000);
}

function buildPrompt(palette: string[], picks: any) {
  const mainColor = palette[0];
  const accentColor = palette[1] || palette[0];
  const eyeColor = palette[2] || accentColor;
  const detailColor = palette[3] || mainColor;

  const prompt = [
    "flat clean 2D cartoon collectible sticker, vector art, thick black lines, simple child-friendly design",
    `soft pastel colors, body main color ${mainColor}, eyes ${eyeColor}, accent ${accentColor}, detail ${detailColor}`,
    "body is rounded blob, 400x450px, fixed pose, short arms & legs, always fully dressed, happy kid-safe style",
    `${picks.expression} facial expression, centered, friendly, not exaggerated`,
    `${picks.headItem ? picks.headItem + ", always on top of head" : ""}`,
    `${picks.eyeItem ? picks.eyeItem + ", on both eyes" : ""}`,
    `${picks.mouthItem ? picks.mouthItem + ", below nose" : ""}`,
    `${picks.clothing ? picks.clothing + ", covers upper body" : ""}`,
    `${picks.neckItem ? picks.neckItem + ", worn on neck" : ""}`,
    `${picks.handItem ? picks.handItem + ", visible in hand" : ""}`,
    "no skin exposed, fully clothed, nothing suggestive, no inappropriate content",
    "front view, straight, full character visible"
  ].filter(Boolean).join(", ");

  const negative = [
    "nsfw, nude, naked, exposed, inappropriate, censored, sexual, explicit, adult, suggestive, erotic, lewd, underwear, skin, belly, bare, open mouth, tongue, cheeks",
    "messy, ugly, broken, cluttered, overlapping limbs, corrupted, cropped, disturbing, offensive"
  ].join(", ");

  return { prompt, negative };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userPfpUrl = body?.pfpUrl || body?.userPfpUrl || "";
    const userId = body?.fid?.toString() || "0";

    if (!userPfpUrl)
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });

    const palette = await extractPaletteFromPFP(userPfpUrl);

    const picks = {
      headItem: pickDeterministic(HEAD_ITEMS, userId + "HEAD"),
      eyeItem: pickDeterministic(EYE_ITEMS, userId + "EYE"),
      mouthItem: pickDeterministic(MOUTH_ITEMS, userId + "MOUTH"),
      clothing: pickDeterministic(CLOTHING, userId + "CLOTH"),
      neckItem: pickDeterministic(NECK_ITEMS, userId + "NECK"),
      handItem: pickDeterministic(HAND_ITEMS, userId + "HAND"),
      expression: pickDeterministic(EXPRESSIONS, userId + "EXP")
    };

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
