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
 * ✅ AI PFP Check (Softer Prompt)
 */
async function verifyIsWarpletStyle(userPfpUrl: string): Promise<{isValid: boolean; message: string}> {
  try {
    const output: any = await replicate.run(
      "yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb",
      {
        input: {
          image: userPfpUrl,
          prompt: `
Look at this image. Does it look like a Warplet NFT PFP?
Traits: A cartoonish, monster-like or creature-like NFT character, typically with chubby/round or cute body, large eyes, fangs/teeth, colorful skin, and playful art. 
If YES, answer YES. Only answer NO if you are very sure it's not a Warplet— for example, it's a photo, logo, human, animal, or completely abstract/random art.
Answer ONLY YES or NO, and be forgiving if unsure.`.trim(),
          max_tokens: 5,
          temperature: 0.1,
        }
      }
    );
    const response = (Array.isArray(output) ? output.join('') : output).trim().toUpperCase();
    if (response.includes("YES")) {
      return { isValid: true, message: "Valid Warplet character" };
    }
    return {
      isValid: false,
      message: "❌ Your profile picture must be a Warplet character. Try using an official or visually similar Warplet image (avoid heavy edits, overlays, or low-res icons)."
    };
  } catch (error) {
    return {
      isValid: true,
      message: "Verification fallback: allowing image (vision model error)" // Avoids blocking due to vision model outage
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

    // Soft AI verification first
    const verification = await verifyIsWarpletStyle(userPfpUrl);
    if (!verification.isValid) {
      return NextResponse.json({
        error: "invalid_pfp",
        message: verification.message,
        tip: "Set your PFP as a Warplet NFT or a Warplet-style monster to mint.",
      }, { status: 403 });
    }

    // Generation (sdxl, similar as in previous setup)
    const output: any = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          image: userPfpUrl,
          prompt: `
A cute kawaii chibi goblin mascot character, family-friendly collectible NFT art. 
Adorable round chubby body, oversized head with big innocent eyes, tiny stubby arms and legs, 
large pointed elf ears, friendly happy expression with big smile showing teeth. 
Consistent Warplets-inspired proportions and style. Professional NFT-quality art.
          `.trim(),
          negative_prompt: `
nsfw, adult content, inappropriate, human, realistic, horror, blurry, distorted, abstract, photo, watermark, multi-character, bad proportions
          `.trim(),
          prompt_strength: 0.7,
          num_inference_steps: 50,
          width: 1024,
          height: 1024,
          guidance_scale: 10.0,
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
      return NextResponse.json({ error: `Failed to fetch: ${imageResponse.status}` }, { status: 502 });
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
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
