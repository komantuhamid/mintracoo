export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import sharp from "sharp";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

/**
 * Auto-crops and centers to 1024x1024
 */
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

    console.log("🎨 Style Transfer with SDXL + IP-Adapter...");
    console.log("User PFP:", userPfpUrl);
    console.log("Style Reference:", styleReferenceUrl);

    // 🔥 USE SDXL WITH IP-ADAPTER FOR TRUE STYLE TRANSFER
    const output: any = await replicate.run(
      "tencentarc/photomaker:ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4",
      {
        input: {
          input_image: userPfpUrl, // Person to transform
          style_image: styleReferenceUrl, // Monster style
          prompt: `Transform this person into a premium monster NFT character. 
Keep their face structure and pose but apply the glowing eyes, dark reptilian scales, 
vibrant neon colors, geometric patterns, dramatic lighting, and mystical energy effects 
from the style reference. The character should be centered, front-facing, with bold outlines, 
and premium NFT aesthetic. Professional digital art, high detail, perfect PFP composition.`,
          negative_prompt: `realistic, photographic, blurry, low quality, boring, plain background, 
multiple people, text, watermark, signature, distorted, cropped, cut off, off-center`,
          num_outputs: 1,
          num_inference_steps: 50,
          style_strength_ratio: 35, // 🔥 CRITICAL: Controls how much style is applied (20-50)
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
        { error: `Failed to fetch generated image: ${imageResponse.status}` },
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
