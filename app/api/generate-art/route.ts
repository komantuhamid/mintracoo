import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pfpUrl = body?.pfpUrl;
    if (!pfpUrl)
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });

    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      {
        input: {
          prompt:
            "ransform this character into an NFT variant with completely new random traits. Keep only the character's body shape and identity. Replace the clothing with new random NFT clothes such as jacket, hoodie, armor, robe, or themed outfits. Add random accessories like gold chains, earrings, piercings, rings, or cigars. Change the headgear into something new like a crown, cap, beanie, cowboy hat, or bandana. Modify the eyes into NFT-style traits such as laser eyes, glowing eyes, sleepy eyes, angry eyes, or cyber eyes. Change the background into a colorful NFT background such as gradients, patterns, cosmic scenes, or neon effects. Alter skin traits by changing colors, markings, spots, textures, or glow. Strong stylization, full makeover, highly creative NFT trait generation",
          input_image: pfpUrl,
          output_format: "jpg",
           safety_tolerance: 2,
           prompt_upsampling: false
        },
      }
    );

    if (!output)
      return NextResponse.json({ error: "No image generated" }, { status: 500 });

    // OPTIONAL: Uncomment below to support base64/dataURL preview
    
    const imageUrl = Array.isArray(output) ? output[0] : output;
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch generated image: ${imageResponse.status}` },
        { status: 502 }
      );
    }
    const imgBuf = Buffer.from(await imageResponse.arrayBuffer());
    const dataUrl = `data:image/jpeg;base64,${imgBuf.toString("base64")}`;

    return NextResponse.json({
      generated_image_url: dataUrl,
      imageUrl: dataUrl,
      success: true,
    });


    // DEFAULT: Return replicate hosted link
    return NextResponse.json({
      generated_image_url: output,
      imageUrl: output,
      success: true,
    });
  } catch (e: any) {
    if (e?.message?.toLowerCase().includes("nsfw")) {
      return NextResponse.json(
        { error: "NSFW content detected. Please try a different image!" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}
