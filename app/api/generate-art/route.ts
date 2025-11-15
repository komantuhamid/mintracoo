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
    .resize(1024, 1024, { fit: "contain", background: bgColor })
    .png()
    .toBuffer();
}

function randomizeTrait() {
  const traits = [
    "spiky hair", "glowing eyes", "tiny wings", "horns", "striped belly", "freckles", "antenna", "star badge", 
    "bubble helmet", "gear-like ears", "patch on vest", "bandana", "fangs", "cheek blush", "tail", "head flower"
  ];
  return traits[Math.floor(Math.random() * traits.length)];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userPfpUrl = body?.pfpUrl || body?.userPfpUrl;
    if (!userPfpUrl) {
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });
    }

    // Extract a random trait each time
    const extraTrait = randomizeTrait();

    // Always use the PFP image for palette and background—never for pose/structure
    const sdxlPrompt = `
A small, chubby, cute cartoon monster mascot, collectible NFT character inspired by Warplets.
Character design:
- Round body, short stubby arms/legs, oversized head, big innocent eyes, smiling mouth, and consistent size.
- Background color palette and skin/clothes colors are EXTRACTED from the provided image (${userPfpUrl}).
- ${extraTrait} as a unique collectible trait (changes every generation).
- Symmetrical, standing past the center, in a clean PFP format.
- Family-friendly, bold black outlines, simple plain background matching dominant color(s) from PFP image.
- Professional NFT art, perfect for stickers or profile avatars.
    `.trim();

    const sdxlNegative = `
human, realistic, nsfw, photo, text, watermark, dark, multiple characters, logo, photo artifacts, bad anatomy, cartoon errors, messy, abstract, severe distortion, violence
    `.trim();

    const output: any = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: sdxlPrompt,
          image: userPfpUrl,
          negative_prompt: sdxlNegative,
          prompt_strength: 0.45, // lower for less direct img2img copying
          num_inference_steps: 45,
          width: 1024,
          height: 1024,
          guidance_scale: 9.5,
          scheduler: "DPMSolverMultistep",
          seed: Math.floor(Math.random() * 1_000_000),
        }
      }
    );

    const imageUrl = Array.isArray(output) ? output[0] : output;
    if (!imageUrl) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ error: `Failed: ${imageResponse.status}` }, { status: 502 });
    }
    const imgBuf = Buffer.from(await imageResponse.arrayBuffer());
    const croppedBuffer = await autocropToSquare(imgBuf, "#1a1a1a");
    const dataUrl = `data:image/png;base64,${croppedBuffer.toString("base64")}`;

    return NextResponse.json({
      generated_image_url: dataUrl,
      imageUrl: dataUrl,
      success: true,
      pfp_palette_source: userPfpUrl,
      applied_trait: extraTrait
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
