// app/api/generate-art/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
// Do NOT import @napi-rs/canvas at top-level (native .node binary would be bundled by webpack)

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN ?? "",
});

const DEFAULT_STYLE_URL = process.env.STYLE_REFERENCE_URL ?? "";

/* ---------- placeholders for canvas functions (assigned at runtime) ---------- */
let createCanvas: any = null;
let loadImage: any = null;

/* ---------- util: try runtime require for canvas (safe) ---------- */
function ensureNapiCanvas(): boolean {
  if (createCanvas && loadImage) return true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const napi = require("@napi-rs/canvas");
    createCanvas = napi.createCanvas;
    loadImage = napi.loadImage;
    return true;
  } catch (e) {
    createCanvas = null;
    loadImage = null;
    return false;
  }
}

/* ---------- optional: create feathered/pixelated face canvas (circle) ----------
   Used only to produce masks or blurred previews; optional at runtime
-------------------------------------------------------------------------- */
async function createFeatheredFaceCanvas(pfpUrl: string, faceDiameter: number, feather: number, thumbFactor = 12): Promise<any> {
  if (!createCanvas || !loadImage) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const napi = require("@napi-rs/canvas");
    createCanvas = napi.createCanvas;
    loadImage = napi.loadImage;
  }

  const pfpImg = await loadImage(pfpUrl);
  const size = Math.ceil(faceDiameter + feather * 2);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const scale = Math.max(faceDiameter / pfpImg.width, faceDiameter / pfpImg.height);
  const dw = Math.round(pfpImg.width * scale);
  const dh = Math.round(pfpImg.height * scale);
  const dx = Math.round((size - dw) / 2);
  const dy = Math.round((size - dh) / 2);

  const thumbSize = Math.max(4, Math.floor(size / thumbFactor));
  const thumb = createCanvas(thumbSize, thumbSize);
  const tctx = thumb.getContext("2d");
  tctx.drawImage(pfpImg, 0, 0, thumbSize, thumbSize);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(thumb, 0, 0, thumbSize, thumbSize, dx, dy, dw, dh);

  ctx.globalAlpha = thumbFactor >= 18 ? 0.22 : 0.12;
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 1.0;

  const gd = ctx.createRadialGradient(
    size / 2,
    size / 2,
    Math.max(0, faceDiameter / 2 - feather),
    size / 2,
    size / 2,
    faceDiameter / 2 + feather
  );
  gd.addColorStop(0, "rgba(0,0,0,1)");
  gd.addColorStop(0.9, "rgba(0,0,0,0.85)");
  gd.addColorStop(1, "rgba(0,0,0,0)");

  const tmp = createCanvas(size, size);
  const tmpCtx = tmp.getContext("2d");
  tmpCtx.drawImage(canvas, 0, 0);
  tmpCtx.globalCompositeOperation = "destination-in";
  tmpCtx.fillStyle = gd as any;
  tmpCtx.fillRect(0, 0, size, size);
  tmpCtx.globalCompositeOperation = "source-over";

  return tmp;
}

/* ---------- optional: mask helper (white = change) ---------- */
function createInverseMaskDataUrlForChangeFace(canvasSize: number, faceX: number, faceY: number, faceSize: number, feather = 32) {
  const m = createCanvas(canvasSize, canvasSize);
  const ctx = m.getContext("2d");

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  const cx = faceX + faceSize / 2;
  const cy = faceY + faceSize / 2;
  const innerR = Math.max(0, faceSize / 2 - Math.max(8, Math.floor(feather / 2)));
  const outerR = faceSize / 2 + Math.max(4, Math.floor(feather / 2));

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  const steps = Math.max(10, Math.ceil(feather / 3));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = innerR + t * (outerR - innerR);
    ctx.globalAlpha = 1 - t;
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  return m.toDataURL("image/png");
}

/* ---------- helpers: extract/convert replicate output ---------- */
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

/* ---------- prompt builder: Image1 = MADLADS (style), Image2 = PFP (identity) ---------- */
function buildPrompt(styleUrl: string, pfpUrl: string): { prompt: string; negative: string } {
  const prompt = `
You are given TWO conceptual images (explained in the prompt, do NOT rely on parameter ordering alone):
- Image 1 (Style reference): ${styleUrl}
  -> This is the style to COPY: color palette, textures (scales/cracks), glow, lighting, rim light, atmosphere.
- Image 2 (PFP / Person): ${pfpUrl}
  -> This is the person. Preserve identity, face, expression, pose and proportions EXACTLY.

Task:
Repaint Image 2 using Image 1's visual language. Keep the same person and pose, but apply Image 1's textures, color palette, glowing effects, dramatic lighting, and mood. Add randomized NFT traits (clothing variants, accessories, optional headgear) but keep all materials/colors consistent with Image 1.

Style rules:
- 2D cartoon NFT illustration (Mad Lads inspired), bold outlines, cel-shading, vibrant flat colors.
- Do NOT introduce photorealism, do NOT distort face or identity.
- Final output: premium NFT version of the supplied PFP using the supplied style reference.
`.trim();

  const negative = `
realistic, photorealistic, 3D, soft gradients, glossy, photography, watermark, text,
change identity, change face shape, age change, gender change,
nsfw, nudity, gore, extra limbs, wrong anatomy, blurry
`.trim();

  return { prompt, negative };
}

/* ------------------ POST handler ------------------ */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pfpUrl: string | undefined = body?.pfpUrl;
    const styleUrl: string = body?.styleUrl ?? DEFAULT_STYLE_URL;

    if (!pfpUrl) return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });
    if (!styleUrl) return NextResponse.json({ error: "styleUrl required" }, { status: 400 });

    // params
    const canvasSize = 1024;
    const faceDiameter = typeof body.faceDiameter === "number" ? body.faceDiameter : 520;
    const feather = typeof body.feather === "number" ? body.feather : 36;
    const userPromptStrength = typeof body.prompt_strength === "number" ? body.prompt_strength : undefined;

    // optional canvas (for mask); we try to load but it's not required
    const hasCanvas = ensureNapiCanvas();

    // optionally produce mask (white = change face), if canvas available
    let maskDataUrl: string | null = null;
    let usedThumbFactor = 12;
    let usedInverseMaskFlow = false;

    if (hasCanvas) {
      try {
        const faceCanvas = await createFeatheredFaceCanvas(pfpUrl, faceDiameter, feather, usedThumbFactor);
        const faceSize = faceCanvas.width;
        const faceX = Math.round((canvasSize - faceSize) / 2);
        const faceY = Math.round(canvasSize * 0.20);
        maskDataUrl = createInverseMaskDataUrlForChangeFace(canvasSize, faceX, faceY, faceSize, Math.max(20, Math.floor(feather * 0.7)));
        usedInverseMaskFlow = true;
      } catch (e) {
        console.warn("Canvas mask creation failed, continuing without mask:", e);
        maskDataUrl = null;
        usedInverseMaskFlow = false;
      }
    }

    // build prompt (explicitly mention which image is style and which is PFP)
    const pb = buildPrompt(styleUrl, pfpUrl);
    const promptText = pb.prompt;
    const negativeText = pb.negative;

    // IMPORTANT: user requested Image1 = style, Image2 = pfp.
    // We include both explicitly. We also set `image` to pfpUrl (main image).
    const inputPayload: any = {
      image: pfpUrl,        // main image: the PFP to be transformed
      image_1: styleUrl,    // Image 1 = style reference (Mad Lads / monster)
      image_2: pfpUrl,      // Image 2 = PFP (identity to preserve)
      prompt: promptText,
      negative_prompt: negativeText,
      prompt_strength: typeof userPromptStrength === "number" ? userPromptStrength : 0.65,
      num_inference_steps: typeof body.num_inference_steps === "number" ? body.num_inference_steps : 50,
      width: canvasSize,
      height: canvasSize,
      guidance_scale: typeof body.guidance_scale === "number" ? body.guidance_scale : 8.5,
      scheduler: "K_EULER_ANCESTRAL",
    };

    if (maskDataUrl) inputPayload.mask = maskDataUrl;

    // call replicate with simple retry on safety-triggered responses
    const modelVersion = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";
    async function callReplicate(payload: any) {
      console.log("Calling replicate with keys:", Object.keys(payload));
      const out = await replicate.run(modelVersion, { input: payload });
      console.log("Replicate raw output (truncated):", JSON.stringify(out).slice(0, 1200));
      return out;
    }

    let output: any = null;
    let finalDataUrl: string | null = null;
    let triedRetry = false;

    try {
      output = await callReplicate(inputPayload);
    } catch (err: any) {
      console.warn("Replicate call failed (initial):", err?.message ?? err);
      const em = String(err?.message ?? "").toLowerCase();
      if ((em.includes("nsfw") || em.includes("safety") || em.includes("forbidden") || em.includes("blocked"))) {
        triedRetry = true;
      } else {
        return NextResponse.json({ ok: false, error: String(err?.message ?? err), replicate_output: err }, { status: 500 });
      }
    }

    // attempt to extract image from output
    if (output) {
      const v = tryExtractImageVariant(output) || tryExtractImageVariant(output?.output) || tryExtractImageVariant(Array.isArray(output) ? output[0] : null);
      if (v && v.type === "data" && v.value) {
        finalDataUrl = v.value;
      } else if (v && v.type === "url" && v.value) {
        finalDataUrl = await fetchImageAsDataUrl(v.value);
      } else {
        const sOut = JSON.stringify(output || "");
        if ((/nsfw|safety|blocked|forbidden|refused/i).test(sOut)) triedRetry = true;
      }
    }

    // one retry attempt if safety triggered or no image found
    if (!finalDataUrl && triedRetry) {
      try {
        console.log("Retrying with stronger blur/lower strength due to safety trigger or missing image.");
        if (hasCanvas) {
          usedThumbFactor = 20;
          const faceCanvasRetry = await createFeatheredFaceCanvas(pfpUrl, faceDiameter, feather, usedThumbFactor);
          const faceSize = faceCanvasRetry.width;
          const faceX = Math.round((canvasSize - faceSize) / 2);
          const faceY = Math.round(canvasSize * 0.20);
          maskDataUrl = createInverseMaskDataUrlForChangeFace(canvasSize, faceX, faceY, faceSize, Math.max(20, Math.floor(feather * 0.7)));
          inputPayload.mask = maskDataUrl;
          inputPayload.prompt_strength = typeof userPromptStrength === "number" ? Math.min(userPromptStrength, 0.45) : 0.45;
          inputPayload.guidance_scale = typeof body.guidance_scale === "number" ? body.guidance_scale : 7.5;
        } else {
          inputPayload.prompt_strength = typeof userPromptStrength === "number" ? Math.min(userPromptStrength, 0.45) : 0.45;
          inputPayload.guidance_scale = typeof body.guidance_scale === "number" ? body.guidance_scale : 7.5;
        }

        const outRetry = await callReplicate(inputPayload);
        output = outRetry;

        const v2 = tryExtractImageVariant(output) || tryExtractImageVariant(output?.output) || tryExtractImageVariant(Array.isArray(output) ? output[0] : null);
        if (v2 && v2.type === "data" && v2.value) {
          finalDataUrl = v2.value;
        } else if (v2 && v2.type === "url" && v2.value) {
          finalDataUrl = await fetchImageAsDataUrl(v2.value);
        } else {
          const s = JSON.stringify(output || "");
          const m = s.match(/https?:\/\/[^"\s}]+?\.(png|jpg|jpeg)/i);
          if (m) finalDataUrl = await fetchImageAsDataUrl(m[0]);
        }
      } catch (e) {
        console.warn("Retry failed:", e);
      }
    }

    // final response: include replicate raw output and final data URL (if any)
    return NextResponse.json({
      ok: true,
      replicate_output: output,
      final_image_data_url: finalDataUrl,
      debug: {
        usedInverseMaskFlow,
        usedThumbFactor,
        prompt_used: promptText,
        note: "Image1 (style) was sent as image_1=styleUrl, Image2 (pfp) was sent as image_2=pfpUrl, main image=image=pfpUrl.",
      },
    });
  } catch (err: any) {
    console.error("generate-art error:", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
