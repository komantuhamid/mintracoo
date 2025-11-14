// app/api/generate-art/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
// Do NOT import @napi-rs/canvas at top-level (native .node binary would be bundled by webpack)

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN ?? "",
});

const DEFAULT_STYLE_URL = process.env.STYLE_REFERENCE_URL ?? "";

/* helper: robust extraction of image variant (url or data) */
function tryExtractImageVariant(o: any): { type: "url" | "data" | null; value: string | null } {
  try {
    if (!o) return { type: null, value: null };
    if (typeof o === "string") {
      if (o.startsWith("data:image/")) return { type: "data", value: o };
      if (/^https?:\/\//i.test(o)) return { type: "url", value: o };
    }
    if (Array.isArray(o) && typeof o[0] === "string") {
      if (o[0].startsWith("data:image/")) return { type: "data", value: o[0] };
      if (/^https?:\/\//i.test(o[0])) return { type: "url", value: o[0] };
    }

    const candidates = [
      o?.url,
      o?.image,
      o?.image_url,
      o?.result,
      o?.output?.[0],
      o?.images?.[0],
      o?.data?.[0],
      o?.[0]?.url,
      o?.[0]?.image,
      o?.[0]?.b64_json,
      o?.[0]?.base64,
      o?.b64_json,
      o?.base64,
    ];
    for (const c of candidates) {
      if (!c) continue;
      if (typeof c === "string") {
        if (c.startsWith("data:image/")) return { type: "data", value: c };
        if (/^https?:\/\//i.test(c)) return { type: "url", value: c };
        if (/^[A-Za-z0-9+/=]+\s*$/.test(c) && c.length > 100) {
          return { type: "data", value: `data:image/png;base64,${c}` };
        }
      }
    }

    // fallback regex search
    const s = JSON.stringify(o || "");
    const m = s.match(/https?:\/\/[^"\s}]+?\.(png|jpg|jpeg)/i);
    if (m) return { type: "url", value: m[0] };
    const bm = s.match(/(?:data:image\/[a-zA-Z]+;base64,)[A-Za-z0-9+/=]+/i);
    if (bm) return { type: "data", value: bm[0] };
  } catch (e) {
    // ignore
  }
  return { type: null, value: null };
}

/* helper: fetch URL -> data:image/png;base64 */
async function fetchImageAsDataUrl(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch (e) {
    console.warn("fetchImageAsDataUrl error:", e);
    return null;
  }
}

/* prompt builder: Image1 = style reference, Image2 = user's PFP */
function buildPromptForStyleTransfer() {
  const prompt = `
Transform Image 2 (the person's PFP) into the visual style of Image 1 (the NFT style reference).
Preserve the person's face, identity, pose and proportions from Image 2 exactly, but repaint them using Image 1's exact colors, textures, glow, lighting and mood.
Apply Image 1's texture language (scales/cracks/glow), color palette (reds/oranges), rim-lighting and dramatic contrast. Keep hat and clothing shapes but restyle their surface to match Image 1.
2D cartoon NFT look: thick bold outlines, flat cel-shading, vibrant solid colors. Keep it safe-for-work, no gore, no sexual content.
`.trim();

  const negative = `
realistic, photorealistic, 3D render, soft gradients, blur, watermark, text, nsfw, nude, gore, extra limbs, wrong anatomy, anime, photo
`.trim();

  return { prompt, negative };
}

/* POST handler */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pfpUrl: string | undefined = body?.pfpUrl; // user's pfp
    const styleUrl: string = body?.styleUrl ?? DEFAULT_STYLE_URL; // MadLads reference

    if (!pfpUrl) return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });
    if (!styleUrl) return NextResponse.json({ error: "styleUrl missing and no DEFAULT_STYLE_URL configured" }, { status: 400 });

    // model selection
    const modelVersion = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

    // build prompts
    const { prompt, negative } = buildPromptForStyleTransfer();

    // input for replicate: pass both images (Image1 = styleUrl, Image2 = pfpUrl)
    // many image2img models accept `image` + `image_2` for multi-image guidance
    const inputPayload: any = {
      // Primary image: style reference (Image 1)
      image: styleUrl,
      // Secondary guidance image: user PFP (Image 2) to preserve identity/pose
      image_2: pfpUrl,
      prompt,
      negative_prompt: negative,
      // tuneable strengths
      prompt_strength: typeof body?.prompt_strength === "number" ? body.prompt_strength : 0.65,
      num_inference_steps: typeof body?.num_inference_steps === "number" ? body.num_inference_steps : 50,
      width: 1024,
      height: 1024,
      guidance_scale: typeof body?.guidance_scale === "number" ? body.guidance_scale : 8.5,
      scheduler: "K_EULER_ANCESTRAL",
    };

    // call replicate
    console.log("Calling replicate (style transfer) with keys:", Object.keys(inputPayload));
    let output: any;
    try {
      output = await replicate.run(modelVersion, { input: inputPayload });
    } catch (err: any) {
      console.warn("Replicate call error:", err?.message ?? err);
      // If replicate returns an error mentioning safety, surface it
      return NextResponse.json({ ok: false, error: String(err?.message ?? err), replicate_output: err }, { status: 500 });
    }

    // try to extract image (data or URL)
    const candidate =
      tryExtractImageVariant(output) ||
      tryExtractImageVariant(output?.output) ||
      tryExtractImageVariant(Array.isArray(output) ? output[0] : null);

    let finalDataUrl: string | null = null;

    if (candidate && candidate.type === "data" && candidate.value) {
      finalDataUrl = candidate.value;
    } else if (candidate && candidate.type === "url" && candidate.value) {
      finalDataUrl = await fetchImageAsDataUrl(candidate.value);
    } else {
      // fallback: attempt regex search in output JSON for URL
      try {
        const s = JSON.stringify(output || "");
        const m = s.match(/https?:\/\/[^"\s}]+?\.(png|jpg|jpeg)/i);
        if (m) finalDataUrl = await fetchImageAsDataUrl(m[0]);
      } catch (e) {
        // ignore
      }
    }

    // If no finalDataUrl found, return raw replicate_output for debugging
    if (!finalDataUrl) {
      return NextResponse.json({
        ok: false,
        error: "No final image produced by model. Try again or check replicate_output.",
        replicate_output: output,
      }, { status: 200 });
    }

    // success: return final image data URL (ready to render on frontend)
    return NextResponse.json({
      ok: true,
      final_image_data_url: finalDataUrl,
      replicate_output: output,
    });
  } catch (err: any) {
    console.error("generate-art error:", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
