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

function buildStyleTransferPrompt(styleReferenceUrl: string) {
  const prompt = `
A premium NFT portrait in the exact style of this reference image: ${styleReferenceUrl}.
Transform the subject into a monster character with glowing yellow/orange eyes, dark reptilian scales, 
geometric patterns, vibrant neon colors (green, red, blue, orange), mystical energy effects, 
and dramatic volumetric lighting. The character should have the same visual aesthetic, texture quality, 
color palette, and artistic style as the reference. Professional digital collectible art, centered composition, 
bold black outlines, high detail PFP format, dark atmospheric background.
`.trim();

  const negative = `
realistic photography, human skin, normal person, plain boring, blurry, low quality, 
multiple people, text, watermark, signature, cropped, distorted, off-center, 
simple cartoon, flat colors, low effort
`.trim();

  return { prompt, negative };
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

    const { prompt, negative } = buildStyleTransferPrompt(styleReferenceUrl);

    console.log("🎨 Style Transfer Generation...");
    console.log("User PFP:", userPfpUrl);
    console.log("Style Reference:", styleReferenceUrl);

    // 🔥 USE SDXL IMG2IMG WITH STRONG STYLE PROMPT
    const output: any = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          image: userPfpUrl, // Base structure
          prompt: prompt, // Style instructions with reference URL
          negative_prompt: negative,
          prompt_strength: 0.80, // 🔥 HIGH = More transformation
          num_inference_steps: 60,
          width: 1024,
          height: 1024,
          guidance_scale: 10.0, // 🔥 STRONG adherence to prompt
          scheduler: "DPMSolverMultistep",
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
