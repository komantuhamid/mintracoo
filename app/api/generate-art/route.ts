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

/**
 * ✅ VERIFY IF USER'S PFP LOOKS LIKE A WARPLET CHARACTER
 * Uses AI vision - no need for 10k reference images!
 */
async function verifyIsWarpletStyle(userPfpUrl: string): Promise<{isValid: boolean; message: string}> {
  try {
    console.log("🔍 Checking if PFP matches Warplets art style...");

    const output: any = await replicate.run(
      "yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb",
      {
        input: {
          image: userPfpUrl,
          prompt: `Look at this image. Answer ONLY "YES" or "NO".

Is this a WARPLETS NFT character with these EXACT traits:
1. Cute monster/creature (NOT human, NOT realistic animal)
2. Chubby/round body with short arms and legs
3. Big expressive eyes (often glowing or colorful)
4. Sharp teeth or fangs clearly visible in mouth
5. Cartoonish/illustrated NFT art style (NOT photograph, NOT 3D render)
6. Colorful textured skin (scales, fur, or patterns)
7. Standing/sitting pose against simple background

Answer:`,
          max_tokens: 5,
          temperature: 0.1,
        }
      }
    );

    const response = (Array.isArray(output) ? output.join('') : output).trim().toUpperCase();
    
    console.log("AI Response:", response);
    
    if (response.includes("YES")) {
      console.log("✅ Valid Warplet detected!");
      return { isValid: true, message: "Valid Warplet character detected" };
    }

    console.log("❌ Not a Warplet character");
    return { 
      isValid: false, 
      message: "❌ Your profile picture must be a Warplet NFT character. Please change your PFP to a Warplet to generate art!" 
    };

  } catch (error) {
    console.error("Vision verification error:", error);
    // Fail open (allow generation) if verification fails
    return { isValid: true, message: "Verification skipped due to error" };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userPfpUrl = body?.pfpUrl || body?.userPfpUrl;

    if (!userPfpUrl) {
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });
    }

    // 🔥 VERIFY USER'S PFP MATCHES WARPLETS STYLE
    const verification = await verifyIsWarpletStyle(userPfpUrl);
    
    if (!verification.isValid) {
      return NextResponse.json({
        error: "invalid_pfp",
        message: verification.message,
        opensea_url: "https://opensea.io/collection/the-warplets"
      }, { status: 403 });
    }

    console.log("🦝 Generating Warplet-Style Goblin NFT...");

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

MANDATORY FEATURES:
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
    
    // NSFW retry logic
    if (e?.message?.includes("NSFW")) {
      console.log("⚠️ NSFW detected, retrying...");
      
      try {
        const retryOutput: any = await replicate.run(
          "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
          {
            input: {
              prompt: `Cute chibi kawaii goblin mascot toy, G-rated family-friendly. Round body, big head, tiny arms, tiny legs, big eyes, friendly smile. Fully clothed. Bold outlines, bright colors, cartoon style.`,
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
        return NextResponse.json({ error: "NSFW filter issue" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
