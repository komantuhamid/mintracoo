export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

// Replace this with an actual color extraction function for real production
async function extractDominantColor(pfpUrl: string) {
  // Basic mock: use filename keywords as color, or fallback color
  const keywords = ["blue", "red", "gold", "green", "pink", "black", "purple", "orange"];
  const match = keywords.find((k) => pfpUrl?.toLowerCase()?.includes(k));
  return match || "random color";
}

function buildPrompt(mainColor: string) {
  const prompt = `
Mad Lads NFT, human portrait, head and shoulders, thick bold outlines, flat cel-shading, vibrant ${mainColor} color palette, random stylish outfit (jacket, hat, tie, hoodie), clean textured background, cartoon style, no monster, no animal, male or female human, professional NFT art, safe for work
`.trim();

  const negative = `
monster, goblin, beast, animal, non-human, exaggerated teeth, multiple eyes, creature, photorealistic, 3d, nsfw, watermark, text, hands, full body, puppet, muppet, round blob
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

    const mainColor = await extractDominantColor(pfpUrl);

    const { prompt, negative } = buildPrompt(mainColor);

    const output: any = await replicate.run(
      "stability-ai/sdxl:latest",
      {
        input: {
          prompt: prompt,
          negative_prompt: negative,
          width: 1024,
          height: 1024,
          num_inference_steps: 50,
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
