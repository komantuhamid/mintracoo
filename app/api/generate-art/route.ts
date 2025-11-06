export const runtime = "nodejs";

import { NextResponse } from "next/server";
import sharp from "sharp";
import { HfInference } from "@huggingface/inference";

// إعدادات عامة
const MODEL_ID = "black-forest-labs/FLUX.1-Krea-dev";
const PROVIDER: "fal-ai" | "hf-inference" = "fal-ai";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// بناء الـ prompt
function buildPrompt(extra?: string) {
  const base = [
    "highly detailed pixel art raccoon NFT avatar",
    "8-bit style, symmetrical face, center composition",
    "vibrant colorful background gradient, detailed outfit, stylish accessories (hat, glasses, crown, cigar)",
    "clean pixel outline, crisp edges, perfect lighting",
    "in the style of top NFT collections, trending OpenSea crypto pixel art",
  ].join(", ");

  const negative = [
    "text, watermark, logo, border, frame",
    "blur, glow, soft, haze, bloom, overexposed, underexposed",
    "human, hands, limbs, deformity, body, distorted",
  ].join(", ");

  return extra ? `${base}, ${extra} ### NEGATIVE: ${negative}` : `${base} ### NEGATIVE: ${negative}`;
}

// قص مركزي مربّع
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

// Pixelate مربّع 1024x1024 مع 32bit RGBA
async function pixelateSquare(input: Buffer, outSize = 1024, blocks = 16) {
  const squared = await centerSquare(input);
  const downW = Math.max(16, Math.floor(outSize / blocks));

  const down = await sharp(squared)
    .resize(downW, downW, { fit: "fill", kernel: sharp.kernel.nearest })
    .toBuffer();

  const up = await sharp(down)
    .resize(outSize, outSize, { fit: "fill", kernel: sharp.kernel.nearest })
    .ensureAlpha() // باش تكون 32bit RGBA
    .png({ compressionLevel: 9, adaptiveFiltering: true })
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

    for (let i = 0; i < 3; i++) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        output = await (hf.textToImage as any)({
          inputs: prompt,
          model: MODEL_ID,
          provider: PROVIDER,
          parameters: {
            width: 1024,
            height: 1024,
            num_inference_steps: 15,
            guidance_scale: 3.0,
            negative_prompt:
              "text, watermark, blur, soft, glow, bloom, haze, frame, border, noisy, artifacts, human, hands, limbs",
          },
        });
        break;
      } catch (e: any) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
      }
    }

    if (!output) {
      const msg =
        lastErr?.message ||
        lastErr?.response?.statusText ||
        "Hugging Face Inference error";
      const status = lastErr?.response?.status || 502;
      return NextResponse.json({ error: msg }, { status });
    }

    // نحول الناتج لباينري
    let imgBuf: Buffer;
    if (typeof output === "string") {
      if (output.startsWith("data:image")) {
        const b64 = output.split(",")[1] || "";
        imgBuf = Buffer.from(b64, "base64");
      } else if (output.startsWith("http")) {
        const r = await fetch(output);
        if (!r.ok)
          return NextResponse.json(
            { error: `Fetch image failed: ${r.status}` },
            { status: 502 }
          );
        imgBuf = Buffer.from(await r.arrayBuffer());
      } else {
        return NextResponse.json(
          { error: "Unexpected string output from provider" },
          { status: 500 }
        );
      }
    } else if (typeof Blob !== "undefined" && output instanceof Blob) {
      imgBuf = Buffer.from(await output.arrayBuffer());
    } else {
      const maybeBlob: Blob | undefined =
        output?.blob || output?.image || output?.output;
      if (maybeBlob && typeof maybeBlob.arrayBuffer === "function") {
        imgBuf = Buffer.from(await maybeBlob.arrayBuffer());
      } else {
        return NextResponse.json(
          { error: "Unknown provider output format" },
          { status: 500 }
        );
      }
    }

    // تحويل لـ pixel art NFT نهائي
    const px = await pixelateSquare(imgBuf, 1024, 16);
    const dataUrl = `data:image/png;base64,${px.toString("base64")}`;

    return NextResponse.json({ generated_image_url: dataUrl });
  } catch (e: any) {
    console.error("HF route error:", e);
    return NextResponse.json(
      { error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}
