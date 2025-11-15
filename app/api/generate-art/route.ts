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
 * ✅ VERIFY IF USER'S PFP IS A WARPLET CHARACTER
 * This MUST pass before generation starts
 */
async function verifyIsWarpletStyle(userPfpUrl: string): Promise<{isValid: boolean; message: string}> {
  try {
    console.log("🔍 Verifying if PFP is a Warplet character...");

    const output: any = await replicate.run(
      "yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb",
      {
        input: {
          image: userPfpUrl,
          prompt: `Look at this image carefully. Answer ONLY "YES" or "NO".

Is this a WARPLETS NFT character? Check ALL these traits:
1. Cartoon monster/creature character (NOT human, NOT abstract art, NOT realistic photo)
2. Has a defined character with body, head, and limbs
3. Chubby/round body shape
4. Big expressive eyes
5. Visible mouth with teeth/fangs
6. Cute chibi/kawaii art style
7. Solid character design (NOT abstract patterns, NOT blurry shapes)

If ANY trait is missing, answer NO.
If this is abstract art, geometric shapes, or anything other than a clear monster character, answer NO.

Answer:`,
          max_tokens: 5,
          temperature: 0.1,
        }
      }
    );

    const response = (Array.isArray(output) ? output.join('') : output).trim().toUpperCase();
    
    console.log("🤖 AI Verification Result:", response);
    
    if (response.includes("YES")) {
      console.log("✅ Valid Warplet character detected!");
      return { isValid: true, message: "Valid Warplet character" };
    }

    console.log("❌ Not a Warplet - blocked");
    return { 
      isValid: false, 
      message: "❌ Your profile picture must be a Warplet NFT character (not abstract art or other images). Please change your PFP to a Warplet!" 
    };

  } catch (error) {
    console.error("Verification error:", error);
    // FAIL SAFE: Block unknown images to prevent distortion
    return { 
      isValid: false, 
      message: "⚠️ Could not verify your PFP. Please make sure it's a clear Warplet character image." 
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userPfpUrl = body?.pfpUrl || body?.userPfpUrl;

    if (!userPfpUrl) {
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });
    }

    // 🔥 STEP 1: VERIFY WARPLET FIRST - THIS PREVENTS DISTORTION
    console.log("=" .repeat(50));
    console.log("STEP 1: Verifying Warplet character...");
    console.log("=" .repeat(50));
    
    const verification = await verifyIsWarpletStyle(userPfpUrl);
    
    if (!verification.isValid) {
      console.log("❌ BLOCKED: Not a Warplet character");
      return NextResponse.json({
        error: "invalid_pfp",
        message: verification.message,
        opensea_url: "https://opensea.io/collection/the-warplets",
        tip: "Make sure your PFP shows a clear Warplet monster character, not abstract art or other images."
      }, { status: 403 });
    }

    console.log("✅ Verification passed - proceeding to generation");
    console.log("=" .repeat(50));
    console.log("STEP 2: Generating Warplet-style art...");
    console.log("=" .repeat(50));

    // 🔥 STEP 2: GENERATE ART (only runs if verification passed)
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
✓ Clean solid color background matching input image
✓ Bold black outlines, professional NFT art
✓ Centered frontal view, symmetrical design
✓ CRISP and CLEAR artwork (no blur, no distortion)

Extract dominant colors from input character for skin tone and clothing. 
Premium collectible digital art, perfect PFP format, wholesome content.`,

          negative_prompt: `nsfw, adult content, inappropriate, suggestive, revealing clothing, nudity, 
sexy, mature, realistic skin, human anatomy, violence, gore, weapons, dark themes, horror, scary, 
disturbing, multiple characters, asymmetrical, rotation, side view, blurry, distorted, abstract, 
low quality, text, watermark, noise, artifacts, compression`,

          prompt_strength: 0.7, // 🔥 Slightly higher to maintain structure
          num_inference_steps: 50,
          width: 1024,
          height: 1024,
          guidance_scale: 10.0, // 🔥 Higher guidance for clarity
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

    console.log("✅ Generation complete!");
    
    return NextResponse.json({
      generated_image_url: dataUrl,
      imageUrl: dataUrl,
      success: true,
    });

  } catch (e: any) {
    console.error("❌ Route error:", e);
    
    // NSFW retry logic
    if (e?.message?.includes("NSFW")) {
      console.log("⚠️ NSFW detected, retrying with safe fallback...");
      
      try {
        const retryOutput: any = await replicate.run(
          "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
          {
            input: {
              prompt: `Cute chibi kawaii goblin mascot toy, G-rated family-friendly. Round body, big head, tiny arms, tiny legs, big eyes, friendly smile. Fully clothed. Bold outlines, bright colors, cartoon style. Clean and crisp artwork.`,
              negative_prompt: `nsfw, adult, inappropriate, human, realistic, scary, blurry, distorted`,
              num_inference_steps: 40,
              width: 1024,
              height: 1024,
              guidance_scale: 8.0,
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
