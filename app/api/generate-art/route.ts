// app/api/generate-art/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN ?? "",
});

const DEFAULT_STYLE_URL = process.env.STYLE_REFERENCE_URL ?? "";

/* ---------- canvas placeholders ---------- */
let createCanvas: any = null;
let loadImage: any = null;

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

/* ---------- create blurred / feathered face canvas ---------- */
async function createFeatheredFaceCanvas(
  pfpUrl: string,
  faceDiameter: number,
  feather: number,
  thumbFactor = 12
): Promise<any> {
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

  // scale to cover faceDiameter
  const scale = Math.max(faceDiameter / pfpImg.width, faceDiameter / pfpImg.height);
  const dw = Math.round(pfpImg.width * scale);
  const dh = Math.round(pfpImg.height * scale);
  const dx = Math.round((size - dw) / 2);
  const dy = Math.round((size - dh) / 2);

  // tiny thumb to pixelate / blur
  const thumbSize = Math.max(4, Math.floor(size / thumbFactor));
  const thumb = createCanvas(thumbSize, thumbSize);
  const tctx = thumb.getContext("2d");
  tctx.drawImage(pfpImg, 0, 0, thumbSize, thumbSize);

  // draw scaled thumb into face area
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(thumb, 0, 0, thumbSize, thumbSize, dx, dy, dw, dh);

  // subtle overlay
  ctx.globalAlpha = thumbFactor >= 18 ? 0.22 : 0.12;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 1.0;

  // mask radial feather
  const mask = createCanvas(size, size);
  const mctx = mask.getContext("2d");
  const cx = size / 2, cy = size / 2;
  const innerR = Math.max(0, faceDiameter / 2 - Math.max(6, Math.floor(feather / 2)));
  const outerR = faceDiameter / 2 + Math.max(2, Math.floor(feather / 2));
  const grad = mctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
  grad.addColorStop(0, "rgba(0,0,0,1)");
  grad.addColorStop(0.9, "rgba(0,0,0,0.85)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  mctx.fillStyle = grad as any;
  mctx.fillRect(0, 0, size, size);

  const out = createCanvas(size, size);
  const outCtx = out.getContext("2d");
  outCtx.drawImage(canvas, 0, 0);
  outCtx.globalCompositeOperation = "destination-in";
  outCtx.drawImage(mask, 0, 0);
  outCtx.globalCompositeOperation = "source-over";

  return out;
}

/* ---------- merge style + face canvas ---------- */
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

  // draw style as cover (center crop)
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

  const faceX = typeof opts?.faceX === "number" ? opts.faceX : Math.round((size - faceCanvas.width) / 2);
  const faceY = typeof opts?.faceY === "number" ? opts.faceY : Math.round(size * 0.20);

  ctx.drawImage(faceCanvas, faceX, faceY, faceCanvas.width, faceCanvas.height);

  return { dataUrl: canvas.toDataURL("image/png"), faceX, faceY, faceSize: faceCanvas.width };
}

/* ---------- create mask where FACE is WHITE (changeable) ---------- */
function createMaskChangeFace(canvasSize: number, faceX: number, faceY: number, faceSize: number, feather = 32) {
  const m = createCanvas(canvasSize, canvasSize);
  const ctx = m.getContext("2d");

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  const cx = faceX + faceSize / 2;
  const cy = faceY + faceSize / 2;
  const innerR = Math.max(0, faceSize / 2 - Math.max(6, Math.floor(feather / 2)));
  const outerR = faceSize / 2 + Math.max(2, Math.floor(feather / 2));

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  const steps = Math.max(8, Math.ceil(feather / 3));
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

/* ---------- helpers for replicate output ---------- */
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
      o?.b64_json, o?.base64
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
  } catch (e) { /* ignore */ }
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

/* ---------- prompts ---------- */
function buildMadLadsPrompt() {
  const prompt = `
2D cartoon NFT character portrait,
Mad Lads style, thick bold black outlines,
flat cel shading, vibrant solid colors,
vintage comic book art, illustrated cartoon style,
textured retro background, same character identity as input PFP but rendered in cartoon style,
professional NFT artwork, safe for work
`.trim();
  const negative = `gore, blood, exposed organs, violent, sexual, nudity, disfigured, graphic, photorealactic, watermark, text`.trim();
  return { prompt, negative };
}

function buildFaceRedrawPrompt() {
  return [
    "Safe-for-work, no gore, no sexual content.",
    "Recreate the face in Mad Lads cartoon style based on the provided blurred/pixelated face reference. Do NOT copy photographic pixels — reinterpret facial features as illustrated cartoon art. Preserve identity and key facial features but render them with Mad Lads linework and flat cel shading.",
    "Adjust colors to harmonize with the face palette; keep pose, clothing, and hat consistent with reference."
  ].join(" ");
}

/* ------------------ POST handler ------------------ */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pfpUrl: string | undefined = body?.pfpUrl;
    if (!pfpUrl) return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });

    const styleUrl: string = body?.styleUrl ?? DEFAULT_STYLE_URL;
    if (!styleUrl) return NextResponse.json({ error: "styleUrl missing and no DEFAULT_STYLE_URL configured" }, { status: 400 });

    const canvasSize = 1024;
    const faceDiameter = typeof body.faceDiameter === "number" ? body.faceDiameter : 520;
    const feather = typeof body.feather === "number" ? body.feather : 36;
    const userPromptStrength = typeof body.prompt_strength === "number" ? body.prompt_strength : undefined;

    const hasCanvas = ensureNapiCanvas();

    let mergedPreviewDataUrl: string | null = null;
    let maskDataUrl: string | null = null;
    let usedThumbFactor = 12;

    if (hasCanvas) {
      try {
        const faceCanvas = await createFeatheredFaceCanvas(pfpUrl, faceDiameter, feather, usedThumbFactor);
        const merged = await mergeStyleWithFace(styleUrl, faceCanvas, { canvasSize });
        mergedPreviewDataUrl = merged.dataUrl;
        maskDataUrl = createMaskChangeFace(canvasSize, merged.faceX, merged.faceY, merged.faceSize, Math.max(16, Math.floor(feather * 0.6)));
      } catch (e) {
        console.warn("Canvas flow failed:", e);
        mergedPreviewDataUrl = null;
        maskDataUrl = null;
      }
    }

    const modelVersion = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

    // choose payload
    let inputPayload: any;
    let promptText = "";
    let negativeText = "";

    if (mergedPreviewDataUrl && maskDataUrl) {
      promptText = buildFaceRedrawPrompt();
      negativeText = "gore, blood, exposed organs, violent, sexual, nudity, disfigured, graphic, photorealactic, watermark, text";
      inputPayload = {
        image: mergedPreviewDataUrl,
        mask: maskDataUrl,
        prompt: promptText,
        negative_prompt: negativeText,
        prompt_strength: typeof userPromptStrength === "number" ? userPromptStrength : 0.6,
        num_inference_steps: typeof body.num_inference_steps === "number" ? body.num_inference_steps : 50,
        width: canvasSize,
        height: canvasSize,
        guidance_scale: typeof body.guidance_scale === "number" ? body.guidance_scale : 8.5,
        scheduler: "K_EULER_ANCESTRAL",
      };
    } else {
      const p = buildMadLadsPrompt();
      promptText = p.prompt;
      negativeText = p.negative;
      inputPayload = {
        image: pfpUrl,
        prompt: promptText,
        negative_prompt: negativeText,
        prompt_strength: typeof userPromptStrength === "number" ? userPromptStrength : 0.5,
        num_inference_steps: typeof body.num_inference_steps === "number" ? body.num_inference_steps : 50,
        width: canvasSize,
        height: canvasSize,
        guidance_scale: typeof body.guidance_scale === "number" ? body.guidance_scale : 9.0,
        scheduler: "K_EULER_ANCESTRAL",
      };
    }

    async function callReplicate(payload: any) {
      console.log("Calling replicate with keys:", Object.keys(payload));
      return await replicate.run(modelVersion, { input: payload });
    }

    let output: any = null;
    let finalDataUrl: string | null = null;
    let triedRetry = false;

    try {
      output = await callReplicate(inputPayload);
    } catch (err: any) {
      console.warn("Initial replicate call failed:", err?.message ?? err);
      const em = String(err?.message ?? "").toLowerCase();
      if ((em.includes("nsfw") || em.includes("safety") || em.includes("forbidden") || em.includes("blocked")) && !triedRetry) {
        triedRetry = true;
      } else {
        return NextResponse.json({ ok: false, error: String(err?.message ?? err), replicate_output: err }, { status: 500 });
      }
    }

    if (output) {
      const v = tryExtractImageVariant(output) || tryExtractImageVariant(output?.output) || tryExtractImageVariant(Array.isArray(output) ? output[0] : null);
      if (v && v.type === "data" && v.value) finalDataUrl = v.value;
      else if (v && v.type === "url" && v.value) finalDataUrl = await fetchImageAsDataUrl(v.value);
      else {
        const sOut = JSON.stringify(output || "");
        if ((/nsfw|safety|blocked|forbidden|refused/i).test(sOut) && !triedRetry) triedRetry = true;
      }
    }

    // retry once
    if (!finalDataUrl && triedRetry) {
      try {
        if (hasCanvas) {
          usedThumbFactor = 20;
          const faceCanvasRetry = await createFeatheredFaceCanvas(pfpUrl, faceDiameter, feather, usedThumbFactor);
          const mergedRetry = await mergeStyleWithFace(styleUrl, faceCanvasRetry, { canvasSize });
          mergedPreviewDataUrl = mergedRetry.dataUrl;
          maskDataUrl = createMaskChangeFace(canvasSize, mergedRetry.faceX, mergedRetry.faceY, mergedRetry.faceSize, Math.max(16, Math.floor(feather * 0.6)));

          promptText = buildFaceRedrawPrompt();
          negativeText = "gore, blood, exposed organs, violent, sexual, nudity, disfigured, graphic, photorealactic, watermark, text";
          inputPayload = {
            image: mergedPreviewDataUrl,
            mask: maskDataUrl,
            prompt: promptText,
            negative_prompt: negativeText,
            prompt_strength: typeof userPromptStrength === "number" ? Math.min(userPromptStrength, 0.45) : 0.45,
            num_inference_steps: typeof body.num_inference_steps === "number" ? body.num_inference_steps : 45,
            width: canvasSize,
            height: canvasSize,
            guidance_scale: typeof body.guidance_scale === "number" ? body.guidance_scale : 7.5,
            scheduler: "K_EULER_ANCESTRAL",
          };
        } else {
          const p = buildMadLadsPrompt();
          promptText = p.prompt;
          negativeText = p.negative;
          inputPayload = {
            image: pfpUrl,
            prompt: promptText,
            negative_prompt: negativeText,
            prompt_strength: typeof userPromptStrength === "number" ? Math.min(userPromptStrength, 0.45) : 0.45,
            num_inference_steps: typeof body.num_inference_steps === "number" ? body.num_inference_steps : 45,
            width: canvasSize,
            height: canvasSize,
            guidance_scale: typeof body.guidance_scale === "number" ? body.guidance_scale : 7.5,
            scheduler: "K_EULER_ANCESTRAL",
          };
        }

        const outRetry = await callReplicate(inputPayload);
        output = outRetry;
        const v2 = tryExtractImageVariant(output) || tryExtractImageVariant(output?.output) || tryExtractImageVariant(Array.isArray(output) ? output[0] : null);
        if (v2 && v2.type === "data" && v2.value) finalDataUrl = v2.value;
        else if (v2 && v2.type === "url" && v2.value) finalDataUrl = await fetchImageAsDataUrl(v2.value);
        else {
          try {
            const s = JSON.stringify(output || "");
            const m = s.match(/https?:\/\/[^"\s}]+?\.(png|jpg|jpeg)/i);
            if (m) finalDataUrl = await fetchImageAsDataUrl(m[0]);
          } catch (_) {}
        }
      } catch (e) {
        console.warn("Retry failed:", e);
      }
    }

    // IMPORTANT: if we have finalDataUrl -> return it (this is what frontend expects)
    if (finalDataUrl) {
      return NextResponse.json({
        ok: true,
        final_image_data_url: finalDataUrl,
        replicate_output: output,
        debug: {
          usedMergedPreview: Boolean(mergedPreviewDataUrl),
          usedThumbFactor,
          prompt_used: String(promptText),
        },
      });
    }

    // If we got here -> no final image -> return error + replicate output for debugging
    return NextResponse.json({
      ok: false,
      error: "No final image produced by model. Try again (server returned replicate_output).",
      replicate_output: output,
      debug: {
        usedMergedPreview: Boolean(mergedPreviewDataUrl),
        usedThumbFactor,
        prompt_used: String(promptText),
      },
    }, { status: 500 });

  } catch (err: any) {
    console.error("generate-art error:", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
