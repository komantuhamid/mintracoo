export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

const STABILITY_API_KEY = process.env.STABILITY_API_KEY || "";

const GOBLIN_COLOR_SCHEMES = [
  { skin: "bright lime green", bg: "soft cream" },
  { skin: "dark forest green", bg: "soft gray" },
  { skin: "mint green", bg: "pale blue" },
  { skin: "cobalt blue", bg: "soft cream" },
  { skin: "navy blue", bg: "light gray" },
  { skin: "violet purple", bg: "soft beige" },
  { skin: "crimson red", bg: "soft gray" },
  { skin: "golden yellow", bg: "soft gray" },
  { skin: "hot pink", bg: "light gray" },
  { skin: "neon green", bg: "dark charcoal" }
];

function getPersonalizedColor(fid: number) {
  return GOBLIN_COLOR_SCHEMES[fid % GOBLIN_COLOR_SCHEMES.length];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fid = body?.fid || 0;
    
    if (!STABILITY_API_KEY) {
      return NextResponse.json({ error: "Missing API key" }, { status: 500 });
    }

    const color = getPersonalizedColor(fid);
    const prompt = `flat 2D cartoon goblin character, ${color.skin} skin, simple style, ${color.bg} background, cute, centered`;
    
    console.log("🎨 Generating...");

    const response = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          text_prompts: [
            { text: prompt, weight: 1 }
          ],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          steps: 30,
          samples: 1,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:", errorText);
      return NextResponse.json(
        { error: `Stability: ${response.status}` },
        { status: response.status }
      );
    }

    const responseJSON = await response.json();
    console.log("✅ Full response:", JSON.stringify(responseJSON));

    if (!responseJSON.artifacts || !responseJSON.artifacts) {
      console.error("❌ No artifacts");
      return NextResponse.json(
        { error: "No artifacts in response" },
        { status: 500 }
      );
    }

    const artifact = responseJSON.artifacts;
    console.log("Artifact:", JSON.stringify(artifact));

    // Try multiple possible fields
    let imageData: string | null = null;
    
    if (artifact.base64) {
      imageData = artifact.base64;
      console.log("✅ Found base64");
    } else if (artifact.url) {
      console.log("✅ Found URL, fetching...");
      const imgResponse = await fetch(artifact.url);
      const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
      imageData = imgBuffer.toString('base64');
    } else if (artifact.image) {
      imageData = artifact.image;
      console.log("✅ Found image field");
    } else {
      console.error("❌ No image data found in artifact");
      console.error("Artifact keys:", Object.keys(artifact));
      return NextResponse.json(
        { error: "No image data in artifact", keys: Object.keys(artifact) },
        { status: 500 }
      );
    }

    const dataUrl = `data:image/png;base64,${imageData}`;
    console.log("✅ Success!");

    return NextResponse.json({
      generated_image_url: dataUrl,
      imageUrl: dataUrl,
      success: true
    });

  } catch (e: any) {
    console.error("❌ Error:", e.message);
    return NextResponse.json({ 
      error: e?.message || "server_error" 
    }, { status: 500 });
  }
}
