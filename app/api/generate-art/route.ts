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

    console.log("📡 Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:", errorText);
      return NextResponse.json(
        { error: `Stability: ${response.status}` },
        { status: response.status }
      );
    }

    const responseJSON = await response.json();
    console.log("✅ Got JSON response");
    console.log("Response structure:", JSON.stringify(responseJSON, null, 2).substring(0, 500));

    // Check if artifacts exist
    if (!responseJSON.artifacts) {
      console.error("❌ No artifacts in response");
      console.error("Full response:", JSON.stringify(responseJSON));
      return NextResponse.json(
        { error: "No artifacts in response" },
        { status: 500 }
      );
    }

    if (!responseJSON.artifacts) {
      console.error("❌ Empty artifacts array");
      return NextResponse.json(
        { error: "Empty artifacts array" },
        { status: 500 }
      );
    }

    const artifact = responseJSON.artifacts;
    console.log("Artifact keys:", Object.keys(artifact));

    const base64Image = artifact.base64;
    
    if (!base64Image) {
      console.error("❌ No base64 in artifact");
      console.error("Artifact:", JSON.stringify(artifact));
      return NextResponse.json(
        { error: "No base64 data in artifact" },
        { status: 500 }
      );
    }

    const dataUrl = `data:image/png;base64,${base64Image}`;
    console.log("✅ Success!");

    return NextResponse.json({
      generated_image_url: dataUrl,
      imageUrl: dataUrl,
      success: true
    });

  } catch (e: any) {
    console.error("❌ Catch error:", e.message);
    console.error("Stack:", e.stack);
    return NextResponse.json({ 
      error: e?.message || "server_error" 
    }, { status: 500 });
  }
}
