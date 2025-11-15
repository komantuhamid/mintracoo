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
            "Cartoon portrait NFT from this image. Clean, bold, comic, professional NFT style, safe for work",
          input_image: pfpUrl,
          output_format: "jpg",
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
