export const runtime = "nodejs";

import { NextResponse } from "next/server";
import sharp from "sharp";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate"; // 🔥 Changed to Replicate!
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

function buildPrompt(extra?: string) {
  const base = [
    "ultra high quality pixel art raccoon NFT avatar, 8-bit style, cel-shaded",
    "centered, symmetrical face, strong black outline, crisp clean edges",
    "vibrant gradient background, stylish outfit, cool accessories (hat, glasses, cigar, crown, chain)",
    "flat color blocks, sharp details, professional NFT quality, HD pixel art"
  ].join(", ");

  const negative = [
    "blurry, soft, glow, bloom, haze, painterly, photorealistic, low quality",
    "gradient banding, noise, jpeg artifacts, compression artifacts",
    "text, watermark, logo, frame, border, human, hands, extra limbs, distorted"
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

async function pixelateSquare(input: Buffer, outSize = 1024, blocks = 16) {
  const squared = await centerSquare(input);
  const downW = Math.max(32, Math.floor(outSize / blocks));

  const down = await sharp(squared)
    .resize(downW, downW, { fit: "fill", kernel: sharp.kernel.nearest })
    .toBuffer();

  const up = await sharp(down)
    .resize(outSize, outSize, { fit: "fill", kernel: sharp.kernel.nearest })
    .sharpen(1.5, 1.2, 0.6)
    .ensureAlpha()
    .png({
      palette: true,
      dither: 0.5,
      compressionLevel: 9,
      quality: 100,
      adaptiveFiltering: true
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
    const hf = new HfInference(HF_TOKEN);

    let output: any = null;
    let lastErr: any = null;

    // 3 attempts with backoff
    for (let i = 0; i < 3; i++) {
      try {
        // 🔥 Using Replicate provider through HF
        output = await (hf.textToImage as any)({
          inputs: prompt,
          model: MODEL_ID,
          provider: PROVIDER, // ✅ Replicate provider
          parameters: {
            width: 1024,
            height: 1024,
            num_inference_steps: 28,
            guidance_scale: 5.0,
            negative_prompt:
              "text, watermark, blur, soft, glow, bloom, haze, frame, border, noisy, artifacts, human, hands, limbs, painterly, photorealistic, gradient banding, low quality, distorted",
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

    // Pixelate with higher quality
    const px = await pixelateSquare(imgBuf, 1024, 16);
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
