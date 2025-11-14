export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

// 🚩 Replace this mock with actual color extraction for production usage
async function extractColorFromPfp(pfpUrl: string) {
  const keywords = ["blue", "red", "gold", "green", "purple", "pink", "yellow", "orange"];
  const match = keywords.find((word) => pfpUrl?.toLowerCase()?.includes(word));
  return match || "random color";
}

function buildPrompt(mainColor: string) {
  const prompt = `
Mad Lads NFT, human portrait only, head and shoulders, thick black outline, flat cel-shading, vibrant ${mainColor} color palette, stylish modern outfit (hoodie, jacket, baseball cap, sunglasses), textured vintage background, cartoon, by <your artist>
`.trim();

  const negative = `
monster, goblin, beast, animal, animal ears, muppet, puppet, round blob, photo, photorealistic, nsfw, 3d, watermark, fantasy, full body
`.trim();

  return { prompt, negative };
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pfpUrl = body?.pfpUrl;
    const mainColor = await extractColorFromPfp(pfpUrl);

    const { prompt, negative } = buildPrompt(mainColor);

    const output: any = await replicate.run(
      "stability-ai/sdxl:latest", // Or the current official SDXL version
      {
        input: {
          prompt: prompt,
          negative_prompt: negative,
          width: 1024,
          height: 1024,
          num_inference_steps: 40,
          guidance_scale: 8.0,
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
