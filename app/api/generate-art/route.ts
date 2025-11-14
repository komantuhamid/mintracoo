// app/api/generate-art/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
// note: do NOT import @napi-rs/canvas at top-level to avoid webpack bundling .node binaries

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN ?? "",
});

const DEFAULT_STYLE_URL = process.env.STYLE_REFERENCE_URL ?? "";

/* placeholders for canvas functions (assigned at runtime) */
let createCanvas: any = null;
let loadImage: any = null;

/* ------------------ soft face canvas (pixelate/blur style) ------------------
   This produces a simplified/blurred face reference so the model re-draws the face
   rather than copying photographic pixels.
-----------------------------------------------------------------------------*/
async function createFeatheredFaceCanvas(pfpUrl: string, faceDiameter: number, feather: number): Promise<any> {
  // runtime require if not loaded
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

  // scale image to cover faceDiameter
  const scale = Math.max(faceDiameter / pfpImg.width, faceDiameter / pfpImg.height);
  const dw = Math.round(pfpImg.width * scale);
  const dh = Math.round(pfpImg.height * scale);
  const dx = Math.round((size - dw) / 2);
  const dy = Math.round((size - dh) / 2);

  // --- tiny thumbnail approach to remove photographic detail ---
  const thumbSize = Math.max(8, Math.floor(size / 12)); // smaller => more smoothing
  const thumb = createCanvas(thumbSize, thumbSize);
  const tctx = thumb.getContext("2d");

  // draw the original PFP into tiny thumb (auto-resize)
  tctx.drawImage(pfpImg, 0, 0, thumbSize, thumbSize);

  // draw the tiny thumb scaled up to final area -> creates pixelated/soft look
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(thumb, 0, 0, thumbSize, thumbSize, dx, dy, dw, dh);

  // light color overlay to further reduce photographic texture
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 1.0;

  // radial gradient feather mask around face edge
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

/* ------------------ merge style (MadLads) + face canvas ------------------ */
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

  // draw style as cover (center-crop)
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

/* ------------------ new mask: make FACE area CHANGABLE (white = change) --------------- */
function createInverseMaskDataUrlForChangeFace(canvasSize: number, faceX: number, faceY: number, faceSize: number, feather = 32) {
  const m = createCanvas(canvasSize, canvasSize);
  const ctx = m.getContext("2d");

  // default preserve everything (black)
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // center: face area -> white (allow change)
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
    ctx.globalAlpha = 1 - t; // inner more opaque white, outer more transparent
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  return m.toDataURL("image/png");
}

/* ------------------ helpers for Replicate output ------------------ */
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

/* ------------------ prompt builders ------------------ */
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
    "Use the provided face reference for skin tone and facial palette (blurred/pixelated reference).",
    // crucial instruction to force re-draw rather than copy pixels
    "Recreate the face in Mad Lads cartoon style based on the provided blurred face reference. Do NOT copy or paste photographic pixels — reinterpret facial features as illustrated cartoon art. Preserve identity and key facial features but render them with Mad Lads linework and flat cel shading.",
    "Recolor and restyle the hat, clothing, and background to harmonize and complement the face skin tone and facial color palette from the provided face reference.",
    "Change clothing textures and patterns subtly to match the face undertones; add small color accents that complement the facial palette.",
    "Convert hat color to a complementary hue and adjust its shading to fit the new clothing style, but keep hat shape and position consistent with reference.",
    "Keep clothing style visually consistent with MadLads (cartoon/comic linework, same level of detail).",
    "Avoid removing accessories or changing pose."
  ].join(" ");
}

/* ------------------ POST handler ------------------ */
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

    // try runtime require for canvas if not yet loaded
    if (!createCanvas || !loadImage) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const napi = require("@napi-rs/canvas");
        createCanvas = napi.createCanvas;
        loadImage = napi.loadImage;
      } catch (e) {
        // if canvas not available, we'll fallback to old pipeline below
        createCanvas = null;
        loadImage = null;
      }
    }

    let mergedPreviewDataUrl: string | null = null;
    let maskDataUrl: string | null = null;
    let useInverseMaskFlow = false;

    if (createCanvas && loadImage) {
      try {
        // 1) create blurred/pixelated face canvas
        const faceCanvas = await createFeatheredFaceCanvas(pfpUrl, faceDiameter, feather);

        // 2) merge face onto style reference
        const merged = await mergeStyleWithFace(styleUrl, faceCanvas, { canvasSize });
        mergedPreviewDataUrl = merged.dataUrl;

        // 3) create mask that ALLOWS changing the face (white = change)
        maskDataUrl = createInverseMaskDataUrlForChangeFace(canvasSize, merged.faceX, merged.faceY, merged.faceSize, Math.max(20, Math.floor(feather * 0.7)));
        useInverseMaskFlow = true;
      } catch (e) {
        console.warn("Canvas flow failed, falling back to raw PFP pipeline:", e);
        mergedPreviewDataUrl = null;
        maskDataUrl = null;
        useInverseMaskFlow = false;
      }
    }

    // Select model & build input
    const modelVersion = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";
    let inputPayload: any = {};
    let promptText = "";
    let negativeText = "";

    if (useInverseMaskFlow && mergedPreviewDataUrl && maskDataUrl) {
      promptText = buildInverseMaskPromptForRestyling();
      negativeText = "do not change body proportions, do not remove accessories, avoid photorealism";
      inputPayload = {
        image: mergedPreviewDataUrl,
        mask: maskDataUrl,
        prompt: promptText,
        negative_prompt: negativeText,
        prompt_strength: typeof prompt_strength === "number" ? prompt_strength : 0.75,
        num_inference_steps: typeof body.num_inference_steps === "number" ? body.num_inference_steps : 50,
        width: canvasSize,
        height: canvasSize,
        guidance_scale: typeof body.guidance_scale === "number" ? body.guidance_scale : 8.5,
        scheduler: "K_EULER_ANCESTRAL",
      };
    } else {
      // fallback old behaviour (send PFP directly with MadLads prompt)
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
    console.log("Replicate output (truncated):", JSON.stringify(output).slice(0, 1500));

    // try to extract an URL and convert to data URL (so frontend can display image)
    let imageUrl: any = Array.isArray(output) ? output[0] : output;
    if (imageUrl && typeof imageUrl === "object" && imageUrl.url) imageUrl = imageUrl.url;

    if (!imageUrl || typeof imageUrl !== "string") {
      try {
        const s = JSON.stringify(output || "");
        const m = s.match(/https?:\/\/[^"\s}]+?\.(png|jpg|jpeg)/i);
        if (m) imageUrl = m[0];
      } catch (e) {
        // ignore
      }
    }

    let finalDataUrl: string | null = null;
    if (imageUrl && typeof imageUrl === "string") {
      try {
        const fetched = await fetchImageAsDataUrl(imageUrl);
        finalDataUrl = fetched;
      } catch (e) {
        console.warn("Failed to fetch/convert replicate image:", e);
      }
    }

    // return all helpful fields: merged preview (instant), replicate raw output, and final data url
    return NextResponse.json({
      ok: true,
      merged_preview: mergedPreviewDataUrl,
      replicate_output: output,
      final_image_data_url: finalDataUrl,
      debug: {
        usedInverseMaskFlow: useInverseMaskFlow,
        prompt_used: promptText,
      },
    });
  } catch (err: any) {
    console.error("generate-art error:", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
