export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import sharp from "sharp";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

/**
 * Auto-crops and centers to perfect 1024x1024 PFP
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

/**
 * Builds dual-image style transfer prompt
 */
function buildStyleTransferPrompt() {
  const prompt = `
Transform the person in the first image into a premium NFT version using the exact visual style of the style reference.
Keep the person's face structure, pose, and identity completely intact, but apply the monster/creature style aesthetic.
Apply reptile-like skin textures, dark scales with glowing edges, fiery glowing eyes with strong red/orange highlights, 
and dramatic volumetric lighting. Maintain the hat and outfit but enhance them with the reference NFT aesthetic: 
dark scales, glowing edges, sharp contrast, and the same color palette. The final result should look like the person 
has transformed into a demonic/creature version with the same artistic style, texture, and color palette as the 
reference NFT. Professional digital art, high detail, centered composition, perfect PFP format.
`.trim();

  const negative = `
realistic photography, blurry, low quality, cropped, cut off, multiple people, 
plain background, boring, text, watermark, signature, distorted anatomy, 
missing limbs, off center, too small, too large, unprofessional
`.trim();

  return { prompt, negative };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userPfpUrl = body?.userPfpUrl; // User's Farcaster PFP
    const styleReferenceUrl = body?.styleReferenceUrl; // Your monster NFT style

    if (!userPfpUrl || !styleReferenceUrl) {
      return NextResponse.json(
        { error: "Both userPfpUrl and styleReferenceUrl are required" },
        { status: 400 }
      );
    }

    const { prompt, negative } = buildStyleTransferPrompt();

    console.log("🎨 Generating NFT with dual-image style transfer...");
    console.log("User PFP:", userPfpUrl);
    console.log("Style Reference:", styleReferenceUrl);

    // 🔥 DUAL IMAGE: User PFP + Style Reference sent together
    const output: any = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          image: userPfpUrl, // Primary: Person to transform
          prompt: `${prompt} Use the exact style from this reference: ${styleReferenceUrl}`,
          negative_prompt: negative,
          prompt_strength: 0.72,
          num_inference_steps: 65,
          width: 1024,
          height: 1024,
          guidance_scale: 9.5,
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
