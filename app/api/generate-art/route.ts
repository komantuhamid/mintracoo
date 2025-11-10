export const runtime = "nodejs";

import { NextResponse } from "next/server";
import sharp from "sharp";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// 🔥 Random background colors for variety
const BG_COLORS = [
  "mint green",
  "pastel pink",
  "light blue",
  "lavender purple",
  "pale yellow",
  "peach orange",
  "baby blue",
  "soft turquoise",
  "cream white",
  "light coral"
];

function getRandomBg() {
  return BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)];
}

function buildPrompt(extra?: string) {
  const bgColor = getRandomBg();
  
  const base = [
    "PIXEL ART STYLE, 8-bit retro game sprite, clean pixel grid",
    "raccoon character with sharp pixel edges, NO gradients, NO blur",
    "crisp blocky pixels, flat color cells, retro game aesthetic",
    `solid ${bgColor} pixelated background, uniform color blocks`,
    "raccoon wearing stylish accessories: crown, hat, glasses, chain, cigar",
    "strong black outlines, cel-shaded flat colors, NO soft shading",
    "professional pixel art NFT, sharp edges, blocky style"
  ].join(", ");

  const negative = [
    "realistic, photorealistic, 3D render, smooth, soft, blurry, gradients",
    "anti-aliasing, smooth edges, soft shadows, glow, bloom, haze",
    "painterly, watercolor, oil painting, sketch, detailed shading",
    "text, watermark, logo, frame, border, signature",
    "human, hands, extra limbs, deformed, distorted, ugly"
  ].join(", ");

  return extra
    ? `${base}, ${extra} ### NEGATIVE: ${negative}`
    : `${base} ### NEGATIVE: ${negative}`;
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

// 🔥 AGGRESSIVE pixelation for clean pixel art
async function pixelateSquare(input: Buffer, outSize = 1024, blocks = 32) {
  const squared = await centerSquare(input);
  
  // Calculate pixel size (32 blocks = 32x32 pixel grid)
  const pixelSize = Math.floor(outSize / blocks);

  // Step 1: Downscale to create pixel blocks
  const down = await sharp(squared)
    .resize(blocks, blocks, { 
      fit: "fill", 
      kernel: sharp.kernel.nearest  // Hard edges, no smoothing
    })
    .toBuffer();

  // Step 2: Upscale back with hard edges (pixelated look)
  const up = await sharp(down)
    .resize(outSize, outSize, { 
      fit: "fill", 
      kernel: sharp.kernel.nearest  // Keep pixel blocks sharp
    })
    .sharpen(2.0, 1.5, 0.8)  // 🔥 Extra sharpening for crisp edges
    .modulate({
      saturation: 1.2,  // 🔥 Boost colors slightly
      brightness: 1.0
    })
    .png({
      palette: true,      // Use indexed color palette (pixel art style)
      dither: 0,          // NO dithering = clean pixel blocks
      compressionLevel: 9,
      quality: 100,
      adaptiveFiltering: false  // Disable smoothing
    })
    .toBuffer();

  return up;
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
    console.log("🎨 Generating with prompt:", prompt.slice(0, 150) + "...");
    
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
            num_inference_steps: 30,
            guidance_scale: 7.5,  // 🔥 Higher = stronger pixel art style
            negative_prompt:
              "realistic, photorealistic, smooth, soft, blurry, gradients, anti-aliasing, 3D, detailed shading, glow, bloom, haze, text, watermark, frame, human, hands, distorted, ugly, low quality",
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

    // 🔥 Apply aggressive pixelation (32x32 grid = clean pixels like 7.jpg)
    const px = await pixelateSquare(imgBuf, 1024, 32);
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
