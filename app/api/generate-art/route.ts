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
      console.error("❌ Error:", errorText);
      return NextResponse.json(
        { error: `Stability: ${response.status}` },
        { status: response.status }
      );
    }

    const responseJSON = await response.json();
    console.log("✅ Got response");

    if (!responseJSON.artifacts || !responseJSON.artifacts) {
      console.error("❌ No artifacts in response");
      return NextResponse.json(
        { error: "No image in response" },
        { status: 500 }
      );
    }

    const base64Image = responseJSON.artifacts.base64;
    const dataUrl = `data:image/png;base64,${base64Image}`;

    console.log("✅ Success! Image size:", base64Image.length, "chars");

    return NextResponse.json({
      generated_image_url: dataUrl,
      imageUrl: dataUrl,
      success: true
    });

  } catch (e: any) {
    console.error("❌ Catch error:", e.message);
    return NextResponse.json({ 
      error: e?.message || "server_error" 
    }, { status: 500 });
  }
}
