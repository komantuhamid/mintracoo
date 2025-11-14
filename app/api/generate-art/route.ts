export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

const STYLE_REFERENCE_URL = "https://up6.cc/2025/10/176307007680191.png";

function buildPrompt() {
  // 🔥 Expression variety
  const EXPRESSIONS = [
    "angry scowling", "evil grinning maniacally",
    "grumpy frowning", "crazy laughing wild",
    "sneaky smirking", "confused dumb looking",
    "aggressive menacing", "proud confident",
    "surprised shocked wide-eyed", "sleepy tired yawning",
    "excited happy beaming", "nervous sweating worried",
    "silly goofy derpy", "cool relaxed chill",
    "mischievous plotting devious"
  ];
  
  const expression = EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)];

  // ✅ CLEAN, PRO PROMPT
const prompt = `
professional NFT character portrait, fat goblin, big pointed ears, ${expression},
full body, centered, standing upright, taking up most of the image frame, proportionally scaled,
not cropped, not too small, not too big, perfect PFP, bold black outlines, crisp lines, flat shading, collectible art,
`.trim();

const negative = `
cropped, cut off body, cut off feet, cut off head, off center, too small, too large, zoomed in, zoomed out,
empty space, character to the side, missing limbs, blurry, watermark, text, multiple characters,
`.trim();



  return { prompt, negative };
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pfpUrl = body?.pfpUrl;

    if (!pfpUrl) {
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });
    }

    const { prompt, negative } = buildPrompt();

    console.log("🎨 Generating Mad Lads style NFT from PFP...");
    console.log("PFP URL:", pfpUrl);

const output: any = await replicate.run(
  "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
  {
    input: {
      image: pfpUrl,
      prompt: prompt,
      negative_prompt: negative,
      prompt_strength: 0.75,        // ⬆️ slightly higher for better style adherence
      num_inference_steps: 80,      // ⬆️ more steps = cleaner results
      width: 1024,
      height: 1024,
      guidance_scale: 10,          // ⬆️ stronger prompt following
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
