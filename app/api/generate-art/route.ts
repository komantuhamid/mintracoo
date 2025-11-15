export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import sharp from "sharp";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

async function autocropToSquare(inputBuffer: Buffer, bgColor = "#1a1a1a"): Promise<Buffer> {
  return await sharp(inputBuffer)
    .trim()
    .resize(1024, 1024, {
      fit: "contain",
      background: bgColor,
    })
    .png()
    .toBuffer();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userPfpUrl = body?.userPfpUrl;
    const styleReferenceUrl = body?.styleReferenceUrl;

    if (!userPfpUrl || !styleReferenceUrl) {
      return NextResponse.json(
        { error: "Both userPfpUrl and styleReferenceUrl are required" },
        { status: 400 }
      );
    }

    console.log("🎨 Style Transfer with InstantID...");

    // 🔥 ALTERNATIVE: InstantID for face-preserving style transfer
    const output: any = await replicate.run(
      "zsxkib/instant-id:8d710c0a93c0e01903a89c5284c9af022fc7c9b69ae0d4e75076d4c6e27d8b74",
      {
        input: {
          image: userPfpUrl,
          style_image: styleReferenceUrl,
          prompt: `Transform into a premium monster NFT. Keep face structure, apply glowing eyes, 
dark reptilian scales, vibrant neon patterns, geometric designs, mystical energy, dramatic lighting. 
Centered composition, bold outlines, professional digital art, high detail PFP.`,
          negative_prompt: `realistic, photo, blurry, bad quality, plain, boring, multiple people, 
text, watermark, cropped, distorted, off-center`,
          num_steps: 40,
          style_strength: 0.75, // 🔥 Adjust 0.5-1.0 for style intensity
          guidance_scale: 7.5,
          seed: -1,
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
        { error: `Failed to fetch: ${imageResponse.status}` },
        { status: 502 }
      );
    }

    const imgBuf = Buffer.from(await imageResponse.arrayBuffer());
    const croppedBuffer = await autocropToSquare(imgBuf, "#1a1a1a");
    const dataUrl = `data:image/png;base64,${croppedBuffer.toString("base64")}`;

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
