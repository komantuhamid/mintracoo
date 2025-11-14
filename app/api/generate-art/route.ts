// app/api/generate-art/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN ?? "",
});

const DEFAULT_STYLE_URL = process.env.STYLE_REFERENCE_URL ?? "";

/* placeholders for canvas functions assigned at runtime */
let createCanvas: any = null;
let loadImage: any = null;

/* try to require @napi-rs/canvas at runtime (safe for Next builds) */
function ensureCanvasRuntime(): boolean {
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

/* create a soft / pixelated circular face canvas (returns canvas object) */
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

  // small overlay to reduce photo details
  ctx.globalAlpha = thumbFactor >= 18 ? 0.22 : 0.12;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 1.0;

  // radial feather mask (destination-in)
  const gd = ctx.createRadialGradient(size / 2, size / 2, Math.max(0, faceDiameter / 2 - feather), size / 2, size / 2, faceDiameter / 2 + feather);
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

/* merge style reference + face canvas into one preview DataURL */
async function mergeStyleWithFace(styleUrl: string, faceCanvas: any, opts?: { canvasSize?: number; faceX?: number; faceY?: number; }) {
  if (!createCanvas || !loadImage) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const napi = require("@napi-rs/canvas");
    createCanvas = napi.createCanvas;
    loadImage = napi.loadImage;
  }

  const size = opts?.canvasSize ?? 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const styleImg = await loadImage(styleUrl);

  // center-crop style to square then draw full
  const sw = styleImg.width;
  const sh = styleImg.height;
  let sx = 0, sy = 0, sWidth = sw, sHeight = sh;
  const imgRatio = sw / sh;
  const canvasRatio = 1;
  if (imgRatio > canvasRatio) {
    sWidth = Math.round(sh * canvasRatio);
    sx = Math.round((sw - sWidth) / 2);
  } else if (imgRatio < canvasRatio) {
    sHeight = Math.round(sw / canvasRatio);
    sy = Math.round((sh - sHeight) / 2);
  }
  ctx.drawImage(styleImg, sx, sy, sWidth, sHeight, 0, 0, size, size);

  const faceX = Math.round((size - faceCanvas.width) / 2);
  const faceY = Math.round(size * 0.20);

  ctx.drawImage(faceCanvas, faceX, faceY, faceCanvas.width, faceCanvas.height);

  return { dataUrl: canvas.toDataURL("image/png"), faceX, faceY, faceSize: faceCanvas.width };
}

/* create circular mask where face area = white (changeable) */
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

/* try to extract url or data:image from replicate output (robust) */
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
      o?.url, o?.image, o?.image_url, o?.result, o?.output?.[0], o?.images?.[0],
      o?.data?.[0], o?.[0]?.url, o?.[0]?.image, o?.[0]?.b64_json, o?.[0]?.base64,
      o?.b64_json, o?.base64,
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

/* fetch remote url and convert to data URL */
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

/* prompt builder (user asked to use style reference + pfp mapping) */
function buildPrompt() {
  const prompt = `
Use Image 1 as the main photo (the person's PFP). Use Image 2 as the strict style reference.
Transform Image 1 into a 2D NFT character in the exact style of Image 2: copy color palette, textures, glow, lighting direction and mood.
Preserve the person's face, identity, pose, and proportions exactly, but repaint them in the style of Image 2.
Keep final artwork in cartoon/NFT style: thick outlines, cel shading, no realism, safe for work.
Introduce small randomized NFT traits (clothing/accessories) consistent with Image 2's colors.
`.trim();

  const negative = `
realistic, photorealistic, 3D, blurred, soft gradients, photograph, gore, nudity, explicit, watermark, text, multiple people, wrong anatomy, anime
`.trim();

  return { prompt, negative };
}

/* ---------- POST handler ---------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pfpUrl: string | undefined = body?.pfpUrl;
    const styleUrl: string | undefined = body?.styleUrl ?? DEFAULT_STYLE_URL;

    if (!pfpUrl) return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });
    if (!styleUrl) return NextResponse.json({ error: "styleUrl required or DEFAULT_STYLE_URL missing" }, { status: 400 });

    const canvasSize = 1024;
    const faceDiameter = typeof body.faceDiameter === "number" ? body.faceDiameter : 520;
    const feather = typeof body.feather === "number" ? body.feather : 36;
    const userPromptStrength = typeof body.prompt_strength === "number" ? body.prompt_strength : undefined;

    const hasCanvas = ensureCanvasRuntime();

    let mergedPreviewDataUrl: string | null = null;
    let maskDataUrl: string | null = null;
    let usedThumbFactor = 12;
    let usedInverseMaskFlow = false;

    if (hasCanvas) {
      try {
        const faceCanvas = await createFeatheredFaceCanvas(pfpUrl, faceDiameter, feather, usedThumbFactor);
        const merged = await mergeStyleWithFace(styleUrl, faceCanvas, { canvasSize });
        mergedPreviewDataUrl = merged.dataUrl;
        maskDataUrl = createInverseMaskDataUrlForChangeFace(canvasSize, merged.faceX, merged.faceY, merged.faceSize, Math.max(20, Math.floor(feather * 0.7)));
        usedInverseMaskFlow = true;
      } catch (e) {
        console.warn("Canvas flow failed:", e);
        mergedPreviewDataUrl = null;
        maskDataUrl = null;
        usedInverseMaskFlow = false;
      }
    }

    const modelVersion = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

    // Build input: IMPORTANT mapping requested by you:
    // image: pfpUrl (Image 1 = PFP), image_2: styleUrl (Image 2 = style reference)
    let inputPayload: any;
    const { prompt, negative } = buildPrompt();
    if (usedInverseMaskFlow && mergedPreviewDataUrl && maskDataUrl) {
      // We already merged style + blurred face locally; send merged as "image" and mask to allow face restyle
      inputPayload = {
        image: mergedPreviewDataUrl,
        mask: maskDataUrl,
        // still pass image_2 as style reference for models that accept multiple images (some do)
        image_2: styleUrl,
        prompt,
        negative_prompt: negative,
        prompt_strength: typeof userPromptStrength === "number" ? userPromptStrength : 0.65,
        num_inference_steps: typeof body.num_inference_steps === "number" ? body.num_inference_steps : 50,
        width: canvasSize,
        height: canvasSize,
        guidance_scale: typeof body.guidance_scale === "number" ? body.guidance_scale : 8.5,
        scheduler: "K_EULER_ANCESTRAL",
      };
    } else {
      // fallback: send pfp directly as image, and style as image_2
      inputPayload = {
        image: pfpUrl,
        image_2: styleUrl,
        prompt,
        negative_prompt: negative,
        prompt_strength: typeof userPromptStrength === "number" ? userPromptStrength : 0.5,
        num_inference_steps: typeof body.num_inference_steps === "number" ? body.num_inference_steps : 50,
        width: canvasSize,
        height: canvasSize,
        guidance_scale: typeof body.guidance_scale === "number" ? body.guidance_scale : 9.0,
        scheduler: "K_EULER_ANCESTRAL",
      };
    }

    // call replicate (with basic try/catch + one intelligent retry if safety triggers)
    async function callRep(payload: any) {
      const out = await replicate.run(modelVersion, { input: payload });
      return out;
    }

    let output: any = null;
    let finalDataUrl: string | null = null;
    let triedRetry = false;

    try {
      output = await callRep(inputPayload);
    } catch (err: any) {
      const em = String(err?.message ?? "").toLowerCase();
      console.warn("Replicate initial call error:", em);
      if ((em.includes("nsfw") || em.includes("safety") || em.includes("blocked") || em.includes("forbidden")) && !triedRetry) {
        triedRetry = true;
      } else {
        return NextResponse.json({ ok: false, error: String(err?.message ?? err), replicate_output: err }, { status: 500 });
      }
    }

    if (output) {
      const candidate = tryExtractImageVariant(output) || tryExtractImageVariant(output?.output) || tryExtractImageVariant(Array.isArray(output) ? output[0] : null);
      if (candidate && candidate.type === "data" && candidate.value) {
        finalDataUrl = candidate.value;
      } else if (candidate && candidate.type === "url" && candidate.value) {
        finalDataUrl = await fetchImageAsDataUrl(candidate.value);
      } else {
        const sOut = JSON.stringify(output || "");
        if ((/nsfw|safety|blocked|forbidden|refused/i).test(sOut) && !triedRetry) {
          triedRetry = true;
        }
      }
    }

    // Retry once with stronger blur and weaker prompt if safety or no image
    if (!finalDataUrl && triedRetry) {
      try {
        if (hasCanvas) {
          usedThumbFactor = 20;
          const faceCanvasRetry = await createFeatheredFaceCanvas(pfpUrl, faceDiameter, feather, usedThumbFactor);
          const mergedRetry = await mergeStyleWithFace(styleUrl, faceCanvasRetry, { canvasSize });
          mergedPreviewDataUrl = mergedRetry.dataUrl;
          maskDataUrl = createInverseMaskDataUrlForChangeFace(canvasSize, mergedRetry.faceX, mergedRetry.faceY, mergedRetry.faceSize, Math.max(20, Math.floor(feather * 0.7)));
          inputPayload = {
            image: mergedPreviewDataUrl,
            mask: maskDataUrl,
            image_2: styleUrl,
            prompt,
            negative_prompt: "gore, blood, sexual, nudity, explicit, photorealistic",
            prompt_strength: 0.45,
            num_inference_steps: 45,
            width: canvasSize,
            height: canvasSize,
            guidance_scale: 7.5,
            scheduler: "K_EULER_ANCESTRAL",
          };
        } else {
          inputPayload = {
            image: pfpUrl,
            image_2: styleUrl,
            prompt,
            negative_prompt: "gore, blood, sexual, nudity, explicit, photorealistic",
            prompt_strength: 0.45,
            num_inference_steps: 45,
            width: canvasSize,
            height: canvasSize,
            guidance_scale: 7.5,
            scheduler: "K_EULER_ANCESTRAL",
          };
        }

        output = await callRep(inputPayload);
        const candidate2 = tryExtractImageVariant(output) || tryExtractImageVariant(output?.output) || tryExtractImageVariant(Array.isArray(output) ? output[0] : null);
        if (candidate2 && candidate2.type === "data" && candidate2.value) {
          finalDataUrl = candidate2.value;
        } else if (candidate2 && candidate2.type === "url" && candidate2.value) {
          finalDataUrl = await fetchImageAsDataUrl(candidate2.value);
        } else {
          // last attempt: try find url in json
          try {
            const s = JSON.stringify(output || "");
            const m = s.match(/https?:\/\/[^"\s}]+?\.(png|jpg|jpeg)/i);
            if (m) finalDataUrl = await fetchImageAsDataUrl(m[0]);
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        console.warn("Retry failed:", e);
      }
    }

    // If still no finalDataUrl, but we have mergedPreview, return it as fallback so frontend can still show something
    // But prefer to set final_image_data_url when present
    return NextResponse.json({
      ok: true,
      merged_preview: mergedPreviewDataUrl,
      replicate_output: output,
      final_image_data_url: finalDataUrl, // <--- THIS IS THE FIELD frontend should use FIRST
      debug: {
        usedInverseMaskFlow,
        usedThumbFactor,
        prompt_used: prompt,
      },
    });
  } catch (err: any) {
    console.error("generate-art error:", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
