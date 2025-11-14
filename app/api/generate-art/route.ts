// app/api/generate-art/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

/**
 * Next.js route that:
 * - attempts to merge style + PFP using @napi-rs/canvas at runtime (if available),
 * - builds an inverse mask (keep face, change hat/clothes/bg),
 * - calls Replicate SDXL with image+mask and returns preview + final image data URL.
 *
 * If canvas is not available (or fails), falls back to sending pfpUrl directly to SDXL
 * with a Mad Lads prompt (the old behavior).
 */

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN ?? "",
});

const DEFAULT_STYLE_URL =
  process.env.STYLE_REFERENCE_URL ??
  "https://up6.cc/2025/10/176307007680191.png";

/* ----------------- helpers ----------------- */

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

function safeGetFirstImageFromReplicate(output: any): string | null {
  try {
    if (!output) return null;
    if (typeof output === "string") return output;
    if (Array.isArray(output) && typeof output[0] === "string") return output[0];
    if (Array.isArray(output) && output[0]?.url) return output[0].url;
    if (output?.output && Array.isArray(output.output) && typeof output.output[0] === "string")
      return output.output[0];
    if (output?.[0]?.url) return output[0].url;
    if (output?.images && Array.isArray(output.images)) {
      if (typeof output.images[0] === "string") return output.images[0];
      if (output.images[0]?.url) return output.images[0].url;
    }
    const s = JSON.stringify(output || "");
    const m = s.match(/https?:\/\/[^"\s}]+?\.(png|jpg|jpeg)/i);
    return m ? m[0] : null;
  } catch (e) {
    console.warn("safeGetFirstImageFromReplicate error:", e);
    return null;
  }
}

/* ----------------- canvas placeholders (will require at runtime) ----------------- */
let createCanvas: any = null;
let loadImage: any = null;
let canvasAvailable = false;

/* Try quick require at module init (non-fatal). If it fails, runtime require inside POST */
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const napi = require("@napi-rs/canvas");
  if (napi?.createCanvas && napi?.loadImage) {
    createCanvas = napi.createCanvas;
    loadImage = napi.loadImage;
    canvasAvailable = true;
  }
} catch {
  canvasAvailable = false;
}

/* ---------- canvas flows ---------- */
async function createFeatheredFaceCanvasRuntime(pfpUrl: string, faceDiameter: number, feather: number) {
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
  ctx.drawImage(pfpImg, dx, dy, dw, dh);

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
  const tctx = tmp.getContext("2d");
  tctx.drawImage(canvas, 0, 0);
  tctx.globalCompositeOperation = "destination-in";
  tctx.fillStyle = gd as any;
  tctx.fillRect(0, 0, size, size);
  tctx.globalCompositeOperation = "source-over";

  return tmp;
}

async function mergeStyleWithFaceRuntime(styleUrl: string, faceCanvas: any, opts?: { canvasSize?: number; faceX?: number; faceY?: number; }) {
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

function createInverseMaskDataUrlRuntime(canvasSize: number, faceX: number, faceY: number, faceSize: number, feather = 32) {
  const m = createCanvas(canvasSize, canvasSize);
  const ctx = m.getContext("2d");

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  const cx = faceX + faceSize / 2;
  const cy = faceY + faceSize / 2;
  const innerR = Math.max(0, faceSize / 2 - Math.max(8, Math.floor(feather / 2)));
  const outerR = faceSize / 2 + Math.max(4, Math.floor(feather / 2));

  ctx.fillStyle = "black";
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
    ctx.fillStyle = "black";
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  return m.toDataURL("image/png");
}

/* ----------------- prompt builders ----------------- */
function buildMadLadsPrompt() {
  const prompt = `
2D cartoon NFT character portrait, 
Mad Lads style, thick bold black outlines, 
flat cel shading, vibrant solid colors, 
vintage comic book art, illustrated cartoon style, 
textured retro background, no realistic details, 
same character from input image but in cartoon style, 
professional NFT artwork, safe for work
`.trim();

  const negative = `
realistic, 3D render, photorealistic, detailed shading, 
soft lighting, gradient shading, hyperrealistic, 
photograph, blurry, nsfw, nude, explicit, 
watermark, text, multiple people, hands, full body, 
plain background, smooth cartoon, anime
`.trim();

  return { prompt, negative };
}

function buildInverseMaskPromptForRestyling() {
  return [
    "Preserve the original character's linework, pose, body proportions, and overall MadLads art style. Do not change the face identity or facial features.",
    "Use the provided face reference for skin tone and facial palette.",
    "Recolor and restyle the hat, clothing, and background to harmonize and complement the face skin tone and facial color palette from the provided face reference.",
    "Change clothing textures and patterns subtly to match the face undertones; add small color accents that complement the facial palette.",
    "Convert hat color to a complementary hue and adjust its shading to fit the new clothing style, but keep hat shape and position consistent with reference.",
    "Keep clothing style visually consistent with MadLads (cartoon/comic linework, same level of detail).",
    "Avoid altering the face, pose, body shape, or removing accessories; only modify hat, clothes, and background styling/colours."
  ].join(" ");
}

/* ----------------- POST handler ----------------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pfpUrl: string | undefined = body?.pfpUrl;
    if (!pfpUrl) return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });

    const styleUrl: string = body?.styleUrl ?? DEFAULT_STYLE_URL;

    // config params
    const canvasSize = 1024;
    const faceDiameter = typeof body.faceDiameter === "number" ? body.faceDiameter : 520;
    const feather = typeof body.feather === "number" ? body.feather : 36;
    const prompt_strength = typeof body.prompt_strength === "number" ? body.prompt_strength : undefined;

    // attempt to use canvas-based merge+inpainting if available
    let mergedPreviewDataUrl: string | null = null;
    let maskDataUrl: string | null = null;
    let useInverseMaskFlow = false;

    // runtime require attempt if not available earlier
    if (!createCanvas || !loadImage) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const napi = require("@napi-rs/canvas");
        createCanvas = napi.createCanvas;
        loadImage = napi.loadImage;
        canvasAvailable = true;
      } catch (e) {
        canvasAvailable = false;
      }
    }

    if (canvasAvailable) {
      try {
        const faceCanvas = await createFeatheredFaceCanvasRuntime(pfpUrl, faceDiameter, feather);
        const merged = await mergeStyleWithFaceRuntime(styleUrl, faceCanvas, { canvasSize });
        mergedPreviewDataUrl = merged.dataUrl;
        maskDataUrl = createInverseMaskDataUrlRuntime(canvasSize, merged.faceX, merged.faceY, merged.faceSize, Math.max(20, Math.floor(feather * 0.7)));
        useInverseMaskFlow = true;
      } catch (e) {
        console.warn("Canvas merge failed, falling back to direct pipeline:", e);
        canvasAvailable = false;
        mergedPreviewDataUrl = null;
        maskDataUrl = null;
        useInverseMaskFlow = false;
      }
    }

    // choose model & inputs
    const modelVersion = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

    let inputPayload: any = {};
    let promptText = "";
    let negativeText = "";

    if (useInverseMaskFlow && mergedPreviewDataUrl && maskDataUrl) {
      promptText = buildInverseMaskPromptForRestyling();
      negativeText = "do not change facial features, do not change body proportions, do not remove hat or clothing items, preserve original pose";
      inputPayload = {
        image: mergedPreviewDataUrl,
        mask: maskDataUrl,
        prompt: promptText,
        negative_prompt: negativeText,
        prompt_strength: typeof prompt_strength === "number" ? prompt_strength : 0.65,
        num_inference_steps: typeof body.num_inference_steps === "number" ? body.num_inference_steps : 50,
        width: canvasSize,
        height: canvasSize,
        guidance_scale: typeof body.guidance_scale === "number" ? body.guidance_scale : 8.0,
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
        prompt_strength: typeof prompt_strength === "number" ? prompt_strength : 0.5,
        num_inference_steps: typeof body.num_inference_steps === "number" ? body.num_inference_steps : 50,
        width: canvasSize,
        height: canvasSize,
        guidance_scale: typeof body.guidance_scale === "number" ? body.guidance_scale : 9.0,
        scheduler: "K_EULER_ANCESTRAL",
      };
    }

    // call replicate
    console.log("Calling replicate with payload keys:", Object.keys(inputPayload));
    const output: any = await replicate.run(modelVersion, { input: inputPayload });

    // debug
    console.log("Replicate output (truncated):", JSON.stringify(output).slice(0, 2000));

    // try to extract image URL then convert to data URL
    const firstUrl = safeGetFirstImageFromReplicate(output);
    let finalDataUrl: string | null = null;
    if (firstUrl) {
      try {
        const fetched = await fetchImageAsDataUrl(firstUrl);
        finalDataUrl = fetched;
      } catch (e) {
        console.warn("Failed to fetch final image URL:", e);
        finalDataUrl = null;
      }
    } else {
      // maybe replicate returned raw data URL / base64 or direct string
      if (typeof output === "string" && output.startsWith("data:image/")) {
        finalDataUrl = output;
      } else if (Array.isArray(output) && typeof output[0] === "string" && output[0].startsWith("data:image/")) {
        finalDataUrl = output[0];
      }
    }

    return NextResponse.json({
      ok: true,
      merged_preview: mergedPreviewDataUrl,
      replicate_output: output,
      final_image_data_url: finalDataUrl,
      debug: {
        usedInverseMaskFlow: useInverseMaskFlow,
        canvasAvailable,
        prompt_used: promptText,
      },
    });
  } catch (err: any) {
    console.error("generate-art error:", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
