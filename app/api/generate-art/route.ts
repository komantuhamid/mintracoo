export const runtime = "nodejs";

import { NextResponse } from "next/server";
import sharp from "sharp";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-schnell"; // ✅ Faster, cleaner
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

const BG_COLORS = [
  "mint green", "pastel pink", "light blue", "lavender purple",
  "pale yellow", "peach orange", "baby blue", "soft turquoise",
  "cream white", "light coral"
];

function getRandomBg() {
  return BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)];
}

function buildPrompt(extra?: string) {
  const bgColor = getRandomBg();
  
  const base = [
    "RETRO 8-BIT PIXEL ART SPRITE, video game character style",
    "SHARP PIXEL BLOCKS, NO BLUR, NO ANTI-ALIASING, hard edges only",
    "raccoon character, simple flat color blocks, cel-shaded style",
    `solid ${bgColor} background, NO gradients, flat pixel color`,
    "crown OR hat OR glasses OR cigar, minimalist pixel accessories",
    "THICK BLACK PIXEL OUTLINES, retro game aesthetic, blocky style",
    "professional pixel art NFT, clean crisp edges, NO smoothing"
  ].join(", ");

  const negative = [
    "blur, blurry, soft, smooth, anti-aliased, gradients, soft edges",
    "realistic, photorealistic, 3D, detailed, painterly, airbrushed",
    "glow, bloom, haze, fog, atmospheric, soft shadows, depth of field",
    "text, watermark, logo, signature, frame, border",
    "human, hands, extra limbs, deformed, distorted"
  ].join(", ");

  return `${base} ### NEGATIVE: ${negative}`;
}

async function centerSquare(input: Buffer) {
  const meta = await sharp(input).metadata();
  const w = meta.width || 1024;
  const h = meta.height || 1024;
  const s = Math.min(w, h);

  return sharp(input)
    .extract({
      left: Math.floor((w - s) / 2),
      top: Math.floor((h - s) / 2),
      width: s,
      height: s,
    })
    .toBuffer();
}

// 🔥 ULTRA-SHARP PIXELATION - No blur at all!
async function ultraPixelate(input: Buffer) {
  const squared = await centerSquare(input);
  
  // 1. Convert to exact pixel grid (24x24 = bigger, clearer pixels)
  const pixelGrid = 24; // Larger = more visible pixels
  
  const tiny = await sharp(squared)
    .resize(pixelGrid, pixelGrid, {
      fit: "fill",
      kernel: sharp.kernel.nearest, // ZERO smoothing
    })
    .toBuffer();

  // 2. Scale up with ZERO interpolation (hard pixel blocks)
  const big = await sharp(tiny)
    .resize(1024, 1024, {
      fit: "fill",
      kernel: sharp.kernel.nearest, // Keep hard edges
    })
    .toBuffer();

  // 3. Apply extreme contrast and sharpness
  const final = await sharp(big)
    .linear(1.3, -20) // 🔥 Increase contrast, darken edges
    .sharpen({
      sigma: 3.0,     // 🔥 Maximum edge sharpness
      m1: 2.5,        // 🔥 Edge multiplier
      m2: 1.0,
      x1: 3,
      y2: 15,
      y3: 15
    })
    .modulate({
      saturation: 1.3,  // 🔥 Boost color saturation
      brightness: 1.05
    })
    .normalise()        // 🔥 Maximize contrast
    .png({
      palette: true,    // Indexed colors (pixel art)
      colors: 256,      // Limit color palette
      dither: 0,        // NO dithering = flat blocks
      compressionLevel: 9,
      quality: 100,
      adaptiveFiltering: false
    })
    .toBuffer();

  return final;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const style: string | undefined = body?.style;

    if (!HF_TOKEN) {
      return NextResponse.json(
        { error: "Missing HUGGINGFACE_API_TOKEN" },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(style);
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
            num_inference_steps: 4, // ✅ Schnell = fast, cleaner
            guidance_scale: 0,      // ✅ No guidance for cleaner output
            negative_prompt:
              "blur, blurry, soft, smooth, anti-aliased, gradients, realistic, photorealistic, 3D, detailed, glow, bloom, haze, text, watermark",
          },
        });
        break;
      } catch (e: any) {
        lastErr = e;
        if (i < 2) await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
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

    // 🔥 Apply ULTRA-SHARP pixelation
    const px = await ultraPixelate(imgBuf);
    const dataUrl = `data:image/png;base64,${px.toString("base64")}`;

    return NextResponse.json({
      generated_image_url: dataUrl,
      success: true
    });

  } catch (e: any) {
    console.error("Route error:", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
