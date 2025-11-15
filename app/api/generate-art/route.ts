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

    console.log("🎨 Fooocus Style Transfer...");
    console.log("User PFP:", userPfpUrl);
    console.log("Style Reference:", styleReferenceUrl);

    // 🔥 USE FOOOCUS WITH IMAGE PROMPT (ACTUALLY READS YOUR STYLE IMAGE!)
    const output: any = await replicate.run(
      "konieshadow/fooocus-api:fda927242b1db6affa1ece4f54c37f19b964666bf23b0d06ae2439067cd344a4",
      {
        input: {
          input_image: userPfpUrl, // Person base
          style_selections: "Fooocus V2,Fooocus Enhance,Fooocus Sharp",
          prompt: `Transform this person into a premium monster NFT character. Apply glowing yellow/orange eyes, 
dark reptilian scales, geometric patterns, vibrant neon colors (green, red, blue, orange), mystical energy effects, 
and dramatic lighting. Keep face structure and pose. Professional digital collectible art, centered, bold outlines, 
high detail PFP format.`,
          negative_prompt: `realistic photo, human skin, normal person, boring, blurry, bad quality, multiple people, text, watermark`,
          image_prompts_0: styleReferenceUrl, // 🔥 YOUR STYLE REFERENCE (ACTUALLY USED!)
          image_prompt_weight_0: 0.75, // 🔥 75% style strength
          guidance_scale: 7.5,
          sharpness: 2.0,
          num_inference_steps: 40,
          refiner_switch: 0.8,
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
