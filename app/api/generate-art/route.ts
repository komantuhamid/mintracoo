export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

const STYLE_REFERENCE_URL = "https://up6.cc/2025/10/176307007680191.png";

function buildPrompt() {
  // 🔥 SUPER STRONG Mad Lads style prompt
  const prompt = `
2D cartoon NFT character portrait, 
thick bold black outlines, 
flat cel shading, vibrant solid colors, 
vintage comic book art, illustrated cartoon style, 
textured retro background, no realistic details, 
same character from input image but in cartoon style, 
professional NFT artwork, safe for work
`.trim();

  const negative = `
realistic, 3D render, photorealistic, detailed shading, 
soft lighting, gradient shading, hyperrealistic, 
photograph, blurry, nsfw, nude, explicit, 
watermark, text, multiple people, hands, full body, 
plain background, smooth cartoon, anime
`.trim();

  return { prompt, negative };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pfpUrl = body?.pfpUrl;

    if (!pfpUrl) {
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });
    }

    const { prompt, negative } = buildPrompt();

    console.log("🎨 Generating Mad Lads style NFT from PFP...");
    console.log("PFP URL:", pfpUrl);

    const output: any = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          image: pfpUrl, // PFP
          prompt: prompt, // 1/1 style keywords
          negative_prompt: negative,
          prompt_strength: 0.44, // 🔥 higher = more style, less realism
          num_inference_steps: 60,
          width: 1024,
          height: 1024,
          guidance_scale: 50, // 🔥 stronger adherence to prompt
          scheduler: "K_EULER_ANCESTRAL",
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
    const dataUrl = `data:image/png;base64,${imgBuf.toString("base64")}`;

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
