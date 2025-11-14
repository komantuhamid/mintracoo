// app/api/generate-art/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
// Do NOT import @napi-rs/canvas at top-level to avoid bundling native .node files

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN ?? "",
});

const DEFAULT_STYLE_URL = process.env.STYLE_REFERENCE_URL ?? "";

/* ---------- placeholders for canvas functions (assigned at runtime) ---------- */
let createCanvas: any = null;
let loadImage: any = null;

/* ---------- try runtime require for canvas (safe) ---------- */
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

/* ---------- improved feathered/pixelated circular face canvas ---------- */
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

  // scale input to cover the circular face area
  const scale = Math.max(faceDiameter / pfpImg.width, faceDiameter / pfpImg.height);
  const dw = Math.round(pfpImg.width * scale);
  const dh = Math.round(pfpImg.height * scale);
  const dx = Math.round((size - dw) / 2);
  const dy = Math.round((size - dh) / 2);

  // tiny thumbnail to remove photographic detail (pixelate / blur)
  const thumbSize = Math.max(4, Math.floor(size / thumbFactor));
  const thumb = createCanvas(thumbSize, thumbSize);
  const tctx = thumb.getContext("2d");
  tctx.drawImage(pfpImg, 0, 0, thumbSize, thumbSize);

  // draw pixelated scaled thumb into main canvas area
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(thumb, 0, 0, thumbSize, thumbSize, dx, dy, dw, dh);

  // subtle overlay to reduce texture (depends on thumbFactor)
  ctx.globalAlpha = thumbFactor >= 18 ? 0.22 : 0.12;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 1.0;

  // build radial gradient mask for feathered circular shape
  const mask = createCanvas(size, size);
  const mctx = mask.getContext("2d");

  const cx = size / 2;
  const cy = size / 2;
  const innerR = Math.max(0, faceDiameter / 2 - Math.max(6, Math.floor(feather / 2)));
  const outerR = faceDiameter / 2 + Math.max(2, Math.floor(feather / 2));

  const grad = mctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
  grad.addColorStop(0, "rgba(0,0,0,1)");
  grad.addColorStop(0.9, "rgba(0,0,0,0.85)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  mctx.fillStyle = grad as any;
  mctx.fillRect(0, 0, size, size);

  // apply mask via destination-in to get feathered circular face
  const out = createCanvas(size, size);
  const outCtx = out.getContext("2d");
  outCtx.drawImage(canvas, 0, 0);
  outCtx.globalCompositeOperation = "destination-in";
  outCtx.drawImage(mask, 0, 0);
  outCtx.globalCompositeOperation = "source-over";

  return out;
}

/* ---------- helper: merge style (MadLads) + faceCanvas into one image (dataURL) ---------- */
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

  // draw style image as cover (center crop)
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

/* ---------- helpers: fetch/convert output from Replicate ---------- */
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
          // assume base64 PNG
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

/* ---------- prompt builders ---------- */
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
gore, blood, exposed organs, violent, sexual, nudity, disfigured, graphic, photorealactic, watermark, text
`.trim();

  return { prompt, negative };
}

function buildMergedPromptForFaceRedraw() {
  return [
    "Safe-for-work, non sexual, no gore, no blood.",
    "Recreate the face in Mad Lads cartoon style based on the provided blurred/pixelated face reference. Do NOT copy photographic pixels — reinterpret facial features as illustrated cartoon art. Preserve identity and key facial features but render them with Mad Lads linework and flat cel shading.",
    "Recolor and restyle the hat, clothing, and background subtly to harmonize with the face palette, but keep pose and accessories intact."
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

    // params
    const canvasSize = 1024;
    const faceDiameter = typeof body.faceDiameter === "number" ? body.faceDiameter : 520;
    const feather = typeof body.feather === "number" ? body.feather : 36;
    const userPromptStrength = typeof body.prompt_strength === "number" ? body.prompt_strength : undefined;

    // try load canvas at runtime
    const hasCanvas = ensureNapiCanvas();

    // prepare merged preview (if canvas exists)
    let mergedPreviewDataUrl: string | null = null;
    let usedThumbFactor = 12;
    let usedMergedPrompt = "";

    if (hasCanvas) {
      try {
        const faceCanvas = await createFeatheredFaceCanvas(pfpUrl, faceDiameter, feather, usedThumbFactor);
        const merged = await mergeStyleWithFace(styleUrl, faceCanvas, { canvasSize });
        mergedPreviewDataUrl = merged.dataUrl;
        usedMergedPrompt = buildMergedPromptForFaceRedraw();
      } catch (e) {
        console.warn("Canvas merge failed, will fallback to sending pfp directly:", e);
        mergedPreviewDataUrl = null;
      }
    }

    // build initial replicate payload
    const modelVersion = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

    let inputPayload: any = {};
    let promptText: string = "";
    let negativeText = "";

    if (mergedPreviewDataUrl) {
      promptText = usedMergedPrompt;
      negativeText = "gore, blood, exposed organs, violent, sexual, nudity, disfigured, graphic, photorealactic, watermark, text";
      inputPayload = {
        image: mergedPreviewDataUrl, // merged image: style + blurred face
        // intentionally NO mask: we want the model to redraw the face naturally
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
      // fallback: send pfp directly with MadLads prompt
      const { prompt, negative } = buildMadLadsPrompt();
      promptText = prompt;
      negativeText = negative;
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

    // call replicate with retry on safety issues
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
      // mark for retry if looks like safety/NSFW
      const em = String(err?.message ?? "").toLowerCase();
      if ((em.includes("nsfw") || em.includes("safety") || em.includes("forbidden") || em.includes("blocked")) && !triedRetry) {
        triedRetry = true;
      } else {
        return NextResponse.json({ ok: false, error: String(err?.message ?? err), replicate_output: err }, { status: 500 });
      }
    }

    // try extract image from first output
    if (output) {
      const v = tryExtractImageVariant(output) || tryExtractImageVariant(output?.output) || tryExtractImageVariant(Array.isArray(output) ? output[0] : null);
      if (v && v.type === "data" && v.value) {
        finalDataUrl = v.value;
      } else if (v && v.type === "url" && v.value) {
        finalDataUrl = await fetchImageAsDataUrl(v.value);
      } else {
        const sOut = JSON.stringify(output || "");
        if ((/nsfw|safety|blocked|forbidden|refused/i).test(sOut) && !triedRetry) {
          triedRetry = true;
        }
      }
    }

    // Retry once if needed: stronger blur (bigger thumbFactor) + lower prompt_strength + stricter negative
    if (!finalDataUrl && triedRetry) {
      console.log("Retrying replicate with stronger blur & weaker strength...");
      try {
        if (hasCanvas) {
          usedThumbFactor = 20; // stronger blur
          const faceCanvasRetry = await createFeatheredFaceCanvas(pfpUrl, faceDiameter, feather, usedThumbFactor);
          const mergedRetry = await mergeStyleWithFace(styleUrl, faceCanvasRetry, { canvasSize });
          mergedPreviewDataUrl = mergedRetry.dataUrl;

          promptText = buildMergedPromptForFaceRedraw();
          negativeText = "gore, blood, exposed organs, violent, sexual, nudity, disfigured, graphic, photorealactic, watermark, text";
          inputPayload = {
            image: mergedPreviewDataUrl,
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
          // fallback retry without canvas
          const { prompt, negative } = buildMadLadsPrompt();
          promptText = prompt;
          negativeText = negative;
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
        if (v2 && v2.type === "data" && v2.value) {
          finalDataUrl = v2.value;
        } else if (v2 && v2.type === "url" && v2.value) {
          finalDataUrl = await fetchImageAsDataUrl(v2.value);
        } else {
          // last attempt: regex search
          try {
            const s = JSON.stringify(output || "");
            const m = s.match(/https?:\/\/[^"\s}]+?\.(png|jpg|jpeg)/i);
            if (m) finalDataUrl = await fetchImageAsDataUrl(m[0]);
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        console.warn("Retry call failed:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      merged_preview: mergedPreviewDataUrl, // immediate preview (style + blurred face)
      replicate_output: output,
      final_image_data_url: finalDataUrl,
      debug: {
        usedMergedFlow: Boolean(mergedPreviewDataUrl),
        usedThumbFactor,
        prompt_used: String(promptText),
      },
    });
  } catch (err: any) {
    console.error("generate-art error:", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
