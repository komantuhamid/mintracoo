export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// 🔥 Random character types (like your examples!)
const CREATURES = [
  "cute chubby monster",
  "adorable cartoon creature", 
  "funny round animal character",
  "lovable silly beast",
  "charming chubby critter",
  "cute pudgy monster"
];

// 🔥 Random textures/patterns
const TEXTURES = [
  "smooth gray skin",
  "colorful honeycomb pattern scales",
  "striped fur with bold colors",
  "spotted skin with dots",
  "fluffy soft fur",
  "scaly reptile texture",
  "smooth cartoon skin"
];

// 🔥 Random outfits/accessories
const OUTFITS = [
  "wearing sports uniform and helmet, holding sports equipment",
  "wearing casual hoodie and streetwear",
  "wearing no clothes, natural look",
  "wearing simple t-shirt",
  "wearing cap or beanie hat",
  "wearing sunglasses and cool accessories",
  "wearing crown or leaf crown"
];

// 🔥 Random facial features
const FACES = [
  "giant mouth with sharp pointy teeth, huge googly eyes",
  "big wide smile, large expressive eyes",
  "silly grin, round cute eyes",
  "friendly smile, curious eyes",
  "cool confident expression, half-closed eyes",
  "happy excited face, bright eyes"
];

// 🔥 Background colors (solid, like your examples)
const BACKGROUNDS = [
  "light beige background",
  "teal blue background",
  "brown taupe background",
  "tan gold background",
  "slate gray background",
  "dark navy background",
  "cream white background",
  "dusty blue background"
];

function getRandomElement(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt() {
  const creature = getRandomElement(CREATURES);
  const texture = getRandomElement(TEXTURES);
  const outfit = getRandomElement(OUTFITS);
  const face = getRandomElement(FACES);
  const background = getRandomElement(BACKGROUNDS);
  
  const prompt = [
    "cute cartoon character illustration, adorable style",
    `${creature} with ${texture}`,
    `${face}`,
    `${outfit}`,
    "chubby round body shape, standing upright, centered pose",
    "thick black outline, clean vector art style, smooth shading",
    `solid flat ${background}, studio lighting`,
    "professional character design, mascot quality, children's book style",
    "high quality digital art, clean smooth rendering"
  ].join(", ");

  const negative = [
    "realistic, photorealistic, photograph, 3D render",
    "blurry, distorted, ugly, deformed, bad anatomy",
    "text, watermark, logo, signature, frame, border",
    "multiple characters, cropped, human, scary, horror",
    "pixel art, low quality, messy, sketchy"
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
    console.log("🎨 Generating cute monster:", prompt.slice(0, 100) + "...");
    
    const hf = new HfInference(HF_TOKEN);

    let output: any = null;
    let lastErr: any = null;

    for (let i = 0; i < 3; i++) {
      try {
        output = await (hf.textToImage as any)({
          inputs: prompt,
          model: MODEL_ID,
          provider: PROVIDER,
          parameters: {
            width: 1024,
            height: 1024,
            num_inference_steps: 35,
            guidance_scale: 7.0,
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
