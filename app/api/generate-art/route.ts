import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

function getSeed(key: string): number {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) + hash) + key.charCodeAt(i);
  return Math.abs(hash % 1_000_000);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userPfpUrl = body?.pfpUrl || body?.userPfpUrl || "";
    const userId = body?.fid?.toString() || "0";

    if (!userPfpUrl)
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });

    const style =
      "high quality cartoon sticker, vector-like, smooth lines, sticker, simple pastel background";

    const prompt = [
      `A unique 1/1 NFT character, redrawn from the input image, keeping all core features and pose`,
      `Stylized as ${style}.`,
      `Do not add or remove parts, don't invent accessories or new traits, don't change anatomy or proportions.`,
      `Center the character, plain background, soft shadows only.`,
    ].join(", ");

    const negative = [
      "nsfw, inappropriate, new objects, new traits, new accessories, floating shapes, extra limbs, multiple characters, abstract, background pattern, distortion, broken limbs",
    ].join(", ");

    const output: any = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt,
          negative_prompt: negative,
          image: userPfpUrl,
          num_inference_steps: 44,
          width: 1024,
          height: 1024,
          guidance_scale: 12,
          scheduler: "K_EULER_ANCESTRAL",
          seed: getSeed(userId),
        },
      }
    );

    const imageUrl = Array.isArray(output) ? output[0] : output;
    if (!imageUrl)
      return NextResponse.json({ error: "No image generated" }, { status: 500 });

    // Optional: Download and re-host, or serve as dataURL, etc.

    return NextResponse.json({
      generated_image_url: imageUrl,
      prompt,
      seed: getSeed(userId),
      success: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}
