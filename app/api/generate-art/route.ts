export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import sharp from "sharp";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

const GOBLIN_SEED = 42069;

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
    const userPfpUrl = body?.pfpUrl || body?.userPfpUrl;

    if (!userPfpUrl) {
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });
    }

    console.log("🦝 Generating Family-Friendly Goblin NFT...");
    console.log("User PFP:", userPfpUrl);

    const output: any = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          image: userPfpUrl,
          prompt: `A cute kawaii chibi goblin mascot character, family-friendly collectible NFT art. 
Adorable round chubby body, oversized head with big innocent eyes, tiny stubby arms and legs, 
large pointed elf ears, friendly happy expression with big smile showing teeth. 

EXACT CONSISTENT PROPORTIONS:
- Head: 30% of total height, perfect circle
- Body: 40% torso with round belly, fully clothed in simple vest/shirt
- Arms: 35% of body height, stubby with 3-finger hands
- Legs: 30% of height, short stumpy with rounded feet
- Ears: 15% of head height, pointed triangles at 45° angle

MANDATORY FEATURES FOR SAFETY:
✓ Fully clothed character (vest, shirt, pants visible)
✓ Cartoon style, G-rated family content
✓ Bright cheerful colors from input image
✓ Standing upright, neutral friendly pose
✓ Clean background matching input image style
✓ Bold black outlines, professional NFT art
✓ Centered frontal view, symmetrical design

Extract dominant colors from input image for skin tone and clothing. 
Premium collectible digital art, perfect PFP format, wholesome content.`,

          negative_prompt: `nsfw, adult content, inappropriate, suggestive, revealing clothing, nudity, 
sexy, mature, realistic skin, human anatomy, violence, gore, weapons, dark themes, horror, scary, 
disturbing, multiple characters, asymmetrical, rotation, side view, blurry, low quality, text, watermark`,

          prompt_strength: 0.65,
          num_inference_steps: 50,
          width: 1024,
          height: 1024,
          guidance_scale: 9.5,
          scheduler: "DPMSolverMultistep",
          seed: GOBLIN_SEED,
          disable_safety_checker: false, // 🔥 Keep enabled, use safe prompt instead
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
    
    // 🔥 NSFW ERROR HANDLER - Retry with even safer prompt
    if (e?.message?.includes("NSFW")) {
      console.log("⚠️ NSFW detected, retrying with ultra-safe mode...");
      
      try {
        const retryOutput: any = await replicate.run(
          "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
          {
            input: {
              prompt: `Cute chibi kawaii goblin mascot toy, G-rated family-friendly collectible. 
Round body, big head, tiny arms, tiny legs, big innocent eyes, friendly smile. 
Fully clothed in vest and pants. Bold outlines, bright colors, cartoon style. 
Professional toy collectible photography, centered, white background.`,
              
              negative_prompt: `nsfw, adult, inappropriate, human, realistic, scary`,
              
              num_inference_steps: 40,
              width: 1024,
              height: 1024,
              guidance_scale: 7.0,
              seed: GOBLIN_SEED,
            }
          }
        );

        const retryImageUrl = Array.isArray(retryOutput) ? retryOutput[0] : retryOutput;
        const retryResponse = await fetch(retryImageUrl);
        const retryBuf = Buffer.from(await retryResponse.arrayBuffer());
        const retryCropped = await autocropToSquare(retryBuf, "#1a1a1a");
        const retryDataUrl = `data:image/png;base64,${retryCropped.toString("base64")}`;

        return NextResponse.json({
          generated_image_url: retryDataUrl,
          imageUrl: retryDataUrl,
          success: true,
          retried: true,
        });
      } catch (retryError: any) {
        return NextResponse.json({ error: "NSFW filter too sensitive, try again" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
