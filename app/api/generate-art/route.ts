import { NextResponse } from 'next/server';

/**
 * POST /api/generate-art
 * body: { pfp_url: string, style?: string }
 * returns: { generated_image_url: string }
 */
export async function POST(req: Request) {
  try {
    const { pfp_url, style } = await req.json();
    if (!pfp_url) return NextResponse.json({ error: 'missing pfp_url' }, { status: 400 });

    const model = "black-forest-labs/flux-schnell"; // fast + decent quality
    const prompt =
      `High-quality pixel art raccoon avatar sprite; convert the subject into a raccoon-themed character with classic dark eye-mask, small rounded ears, and subtle fur pattern; headshot only; centered; crisp 8-bit palette; clean background; no text; no watermark.`;

    // Kick off prediction
    const start = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        version: model,
        input: {
          prompt,
          image: pfp_url,
          // You can tune more params here if your model supports them
          // e.g., width/height for some models
        },
      }),
    });

    if (!start.ok) {
      const t = await start.text();
      return NextResponse.json({ error: t }, { status: 500 });
    }

    const started = await start.json();

    // Poll for result
    let attempts = 0;
    let url: string | null = null;
    while (attempts < 30 && !url) {
      await new Promise((r) => setTimeout(r, 1500));
      const s = await fetch(`https://api.replicate.com/v1/predictions/${started.id}`, {
        headers: { "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}` },
      });
      if (!s.ok) {
        const t = await s.text();
        return NextResponse.json({ error: t }, { status: 500 });
      }
      const js = await s.json();
      if (js.status === "succeeded") {
        url = Array.isArray(js.output) ? js.output[0] : js.output;
      } else if (js.status === "failed" || js.status === "canceled") {
        return NextResponse.json({ error: "generation failed" }, { status: 500 });
      }
      attempts++;
    }

    if (!url) return NextResponse.json({ error: "timeout" }, { status: 504 });

    return NextResponse.json({ generated_image_url: url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}
