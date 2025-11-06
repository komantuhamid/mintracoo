import { NextResponse } from "next/server";
import sharp from "sharp";

const MODEL_ID = "stabilityai/sdxl-turbo";
const API_URL = `https://api-inference.huggingface.co/models/${MODEL_ID}`;
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to download pfp: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

function buildPrompt(style?: string) {
  const basePrompt = `
  Create a pixel art raccoon avatar with 8-bit style, cute expression, dark eye mask, rounded ears, 
  simple background, crisp outlines, and limited color palette. 
  The result should look like a collectible NFT portrait in pixel art style.
  `;
  return style ? `${basePrompt} Additional style: ${style}` : basePrompt;
}

async function pixelate(input: Buffer, targetMax = 512, blocks = 8) {
  const img = sharp(input);
  const meta = await img.metadata();
  const w = meta.width || 512;
  const h = meta.height || 512;
  const scale = Math.max(w, h) > targetMax ? targetMax / Math.max(w, h) : 1;
  const newW = Math.round(w * scale);
  const newH = Math.round(h * scale);

  const downW = Math.max(16, Math.floor(newW / blocks));
  const downH = Math.max(16, Math.floor(newH / blocks));

  const down = await sharp(input)
    .resize(downW, downH, { fit: "fill", kernel: sharp.kernel.nearest })
    .toBuffer();

  const up = await sharp(down)
    .resize(newW, newH, { fit: "fill", kernel: sharp.kernel.nearest })
    .toFormat("png")
    .toBuffer();

  return up;
}

export async function POST(req: Request) {
  try {
    const { pfp_url, style } = (await req.json().catch(() => ({}))) as {
      pfp_url?: string;
      style?: string;
    };

    if (!HF_TOKEN) {
      return NextResponse.json({ error: "Missing HUGGINGFACE_API_TOKEN" }, { status: 500 });
    }
    if (!pfp_url) {
      return NextResponse.json({ error: "Missing pfp_url" }, { status: 400 });
    }

    const pfpBuffer = await fetchImageBuffer(pfp_url);
    const prompt = buildPrompt(style);

    // Encode image as base64
    const base64 = `data:image/png;base64,${pfpBuffer.toString("base64")}`;

    // Send request to Hugging Face API
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: base64,
        parameters: {
          prompt,
          negative_prompt:
            "text, watermark, low quality, blurry, ugly, duplicate, artifacts, frame, noise, deformed",
          num_inference_steps: 20,
          guidance_scale: 7,
        },
        options: { wait_for_model: true },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Hugging Face API Error", details: text },
        { status: res.status }
      );
    }

    // Try to read the output image
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await res.json();
      if (j.error) throw new Error(j.error);
      if (Array.isArray(j) && j[0]?.image_base64) {
        const imgData = Buffer.from(j[0].image_base64, "base64");
        const pix = await pixelate(imgData, 512, 8);
        return NextResponse.json({
          generated_image_url: `data:image/png;base64,${pix.toString("base64")}`,
        });
      }
      return NextResponse.json({ error: "Invalid image data" }, { status: 500 });
    }

    // Binary fallback
    const buf = Buffer.from(await res.arrayBuffer());
    const pixel = await pixelate(buf, 512, 8);
    const dataUrl = `data:image/png;base64,${pixel.toString("base64")}`;

    return NextResponse.json({ generated_image_url: dataUrl });
  } catch (e: any) {
    console.error("HF generate error:", e);
    return NextResponse.json(
      { error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}
