import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import sharp from "sharp";
import getColors from "get-image-colors"; // or use 'colorthief'/'fast-average-color-node'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

async function extractPalette(imageUrl: string): Promise<string[]> {
  // Fetch and buffer the image, extract dominant colors (as hex)
  const res = await fetch(imageUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  const colors = await getColors(buffer, "image/jpeg");
  return colors.map(c => c.hex());
}

function randomizeTrait() {
  const traits = [
    "spiky hair", "glowing eyes", "tiny wings", "striped belly", "freckles", "antenna", "star badge", 
    "bubble helmet", "fangs", "cheek blush", "tail", "patch", "horns", "bandana"
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

    // Extract palette
    const paletteArr = await extractPalette(userPfpUrl);
    const palette = paletteArr.join(", ");
    const extraTrait = randomizeTrait();

    const sdxlPrompt = `
A small, chubby, cute monster NFT character with a simple round body, stubby legs/arms, oversized round head, big eyes, friendly smile.
Color palette: ${palette}.
Background and accent also use ${paletteArr[0]}.
Wears: ${extraTrait}.
Centered, front view, sticker profile, family-friendly, clean vector outlines, solid color background, not abstract, not human, not realistic.
    `.trim();

    const sdxlNegative = `
realistic, photo, text, watermark, glitch, abstract, nsfw, distortion, bad hands, deformed, humans, multi-character, logo
    `.trim();

    const output: any = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: sdxlPrompt,
          negative_prompt: sdxlNegative,
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
    const imgBuf = Buffer.from(await imageResponse.arrayBuffer());
    const croppedBuffer = await sharp(imgBuf).resize(1024, 1024).png().toBuffer();
    const dataUrl = `data:image/png;base64,${croppedBuffer.toString("base64")}`;

    return NextResponse.json({
      generated_image_url: dataUrl,
      imageUrl: dataUrl,
      palette,
      trait: extraTrait,
      success: true
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
