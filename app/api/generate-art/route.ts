export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// 🔥 Random styles for variety
const STYLES = [
  "cyberpunk neon style, futuristic, glowing lights",
  "royal king style, golden crown, elegant robe",
  "street gangster style, gold chain, sunglasses, cigar",
  "wizard style, magical robe, mystical hat, glowing staff",
  "astronaut style, space suit, helmet visor, cosmic background",
  "samurai style, traditional armor, katana, Japanese aesthetic",
  "pirate captain style, tricorn hat, eye patch, treasure map",
  "hip-hop artist style, expensive jewelry, designer outfit, cool pose"
];

const BACKGROUNDS = [
  "neon cityscape at night",
  "luxury penthouse with city view",
  "dark studio with dramatic lighting",
  "mystical forest with glowing plants",
  "outer space with stars and planets",
  "Japanese temple at sunset",
  "tropical beach paradise",
  "futuristic cyberpunk street"
];

function getRandomElement(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt() {
  const style = getRandomElement(STYLES);
  const background = getRandomElement(BACKGROUNDS);
  
  const prompt = [
    "ultra realistic 3D render, photorealistic, highly detailed",
    "anthropomorphic raccoon character, standing upright, confident pose",
    style,
    "professional studio lighting, cinematic quality, 8K resolution",
    "detailed fur texture, expressive eyes, realistic facial features",
    `background: ${background}`,
    "sharp focus, depth of field, masterpiece quality",
    "trending on ArtStation, award-winning CGI, Unreal Engine quality"
  ].join(", ");

  const negative = [
    "cartoon, anime, 2D, flat, illustration, sketch, drawing",
    "pixel art, low quality, blurry, distorted, ugly, deformed",
    "text, watermark, logo, signature, frame, border",
    "multiple subjects, cropped, cut off, amateur, bad anatomy"
  ].join(", ");

  return { prompt, negative };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    if (!HF_TOKEN) {
      return NextResponse.json(
        { error: "Missing HUGGINGFACE_API_TOKEN" },
        { status: 500 }
      );
    }

    const { prompt, negative } = buildPrompt();
    console.log("🎨 Generating 3D raccoon:", prompt.slice(0, 100) + "...");
    
    const hf = new HfInference(HF_TOKEN);

    let output: any = null;
    let lastErr: any = null;

    // 3 attempts with backoff
    for (let i = 0; i < 3; i++) {
      try {
        output = await (hf.textToImage as any)({
          inputs: prompt,
          model: MODEL_ID,
          provider: PROVIDER,
          parameters: {
            width: 1024,
            height: 1024,
            num_inference_steps: 40,  // 🔥 More steps = better quality
            guidance_scale: 7.5,       // 🔥 Strong prompt following
            negative_prompt: negative,
          },
        });
        break;
      } catch (e: any) {
        lastErr = e;
        if (i < 2) {
          await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
        }
      }
    }

    if (!output) {
      const msg = lastErr?.message || "Inference error";
      const status = lastErr?.response?.status || 502;
      return NextResponse.json({ error: msg }, { status });
    }

    // Normalize output
    let imgBuf: Buffer;
    if (typeof output === "string") {
      if (output.startsWith("data:image")) {
        const b64 = output.split(",")[1] || "";
        imgBuf = Buffer.from(b64, "base64");
      } else if (output.startsWith("http")) {
        const r = await fetch(output);
        if (!r.ok) {
          return NextResponse.json(
            { error: `Fetch image failed: ${r.status}` },
            { status: 502 }
          );
        }
        imgBuf = Buffer.from(await r.arrayBuffer());
      } else {
        return NextResponse.json(
          { error: "Unexpected string output" },
          { status: 500 }
        );
      }
    } else if (output instanceof Blob) {
      imgBuf = Buffer.from(await output.arrayBuffer());
    } else {
      const maybeBlob = output?.blob || output?.image || output?.output;
      if (maybeBlob?.arrayBuffer) {
        imgBuf = Buffer.from(await maybeBlob.arrayBuffer());
      } else {
        return NextResponse.json(
          { error: "Unknown output format" },
          { status: 500 }
        );
      }
    }

    // Return high-quality image directly (no pixelation!)
    const dataUrl = `data:image/png;base64,${imgBuf.toString("base64")}`;

    return NextResponse.json({
      generated_image_url: dataUrl,
      success: true
    });

  } catch (e: any) {
    console.error("Route error:", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
