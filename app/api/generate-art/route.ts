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
function ensureNapiCanvas() {
  if (createCanvas && loadImage) return true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const napi = require("@napi-rs/canvas");
    createCanvas = napi.createCanvas;
    loadImage = napi.loadImage;
    return true;
  } catch (e) {
    // canvas not available in environment; we'll fallback to sending pfp directly
    createCanvas = null;
    loadImage = null;
    return false;
  }
}

/* ---------- helper: create feathered/pixelated face canvas (circle)
   - thumbFactor controls blur: larger factor => less blur; smaller => stronger blur
   - default thumbFactor ~12 (size / 12). For retry we use bigger denominator like 20 or 30.
--------------------------------------------------------------------- */
async function createFeatheredFaceCanvas(pfpUrl: string, faceDiameter: number, feather: number, thumbFactor = 12): Promise<any> {
  if (!createCanvas || !loadImage) {
    // try require at runtime
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

  // thumbnail size (smaller => stronger pixelation)
  const thumbSize = Math.max(4, Math.floor(size / thumbFactor));

  const thumb = createCanvas(thumbSize, thumbSize);
  const tctx = thumb.getContext("2d");
  tctx.drawImage(pfpImg, 0, 0, thumbSize, thumbSize);

  // draw the tiny thumb scaled up to final area -> creates pixelated/soft look
  // enable smoothing slightly to avoid super-hard pixels (we want cartoon-friendly blur)
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(thumb, 0, 0, thumbSize, thumbSize, dx, dy, dw, dh);

  // light color overlay to further reduce photographic texture (strength depends on thumbFactor)
  const overlayAlpha = thumbFactor >= 18 ? 0.22 : 0.12;
  ctx.globalAlpha = overlayAlpha;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 1.0;

  // radial gradient feather mask around face edge (destination-in)
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

/* ---------- helper: merge style (MadLads) + faceCanvas ---------- */
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

/* ---------- helper: create inverse mask data URL (white=change face OR white=change everything)
   We'll keep the flow that by default we produce mask where face is changeable (white),
   but the code uses mask direction according to intent.
------------------------------------------------------------------ */
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

/* ---------- helper: extract image variant (url or data) from replicate output ---------- */
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
    // common fields
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
    // fallback: regex search
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

/* ---------- helper: fetch remote URL and convert to data URL ---------- */
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

/* ---------- prompt builders with explicit SFW instructions ---------- */
function buildInverseMaskPromptForRestyling() {
  return [
    "Safe-for-work, non sexual, no gore, no blood, no exposed organs, non-violent.",
    "Preserve the original character's linework, pose, body proportions, and overall MadLads art style. Do not change the face identity or facial features.",
    "Use the provided face reference for skin tone and facial palette (blurred/pixelated reference).",
    "Recreate the face in Mad Lads cartoon style based on the provided blurred face reference. Do NOT copy or paste photographic pixels — reinterpret facial features as illustrated cartoon art. Preserve identity and key facial features but render them with Mad Lads linework and flat cel shading.",
    "Recolor and restyle the hat, clothing, and background to harmonize and complement the face skin tone and facial color palette from the provided face reference.",
    "Change clothing textures and patterns subtly to match the face undertones; add small color accents that complement the facial palette.",
    "Convert hat color to a complementary hue and adjust its shading to fit the new clothing style, but keep hat shape and position consistent with reference.",
    "Keep clothing style visually consistent with MadLads (cartoon/comic linework, same level of detail).",
    "Avoid removing accessories or changing pose."
  ].join(" ");
}

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

/* ------------------ POST handler ------------------ */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pfpUrl: string | undefined = body?.pfpUrl;
    if (!pfpUrl) return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });

    const styleUrl: string = body?.styleUrl ?? DEFAULT_STYLE_URL;
    if (!styleUrl) return NextResponse.json({ error: "styleUrl missing and no DEFAULT_STYLE_URL configured" }, { status: 400 });

    // config params
    const canvasSize = 1024;
    const faceDiameter = typeof body.faceDiameter === "number" ? body.faceDiameter : 520;
    const feather = typeof body.feather === "number" ? body.feather : 36;
    const userPromptStrength = typeof body.prompt_strength === "number" ? body.prompt_strength : undefined;

    // try require canvas at runtime (if available)
    const hasCanvas = ensureNapiCanvas();

    // will store preview + mask
    let mergedPreviewDataUrl: string | null = null;
    let maskDataUrl: string | null = null;
    let usedThumbFactor = 12; // default pixelation factor (size / 12)
    let usedInverseMaskFlow = false;

    if (hasCanvas) {
      try {
        // create blurred face canvas (default blur)
        const faceCanvas = await createFeatheredFaceCanvas(pfpUrl, faceDiameter, feather, usedThumbFactor);
        // merge onto style reference
        const merged = await mergeStyleWithFace(styleUrl, faceCanvas, { canvasSize });
        mergedPreviewDataUrl = merged.dataUrl;
        // mask where face is changeable
        maskDataUrl = createInverseMaskDataUrlForChangeFace(canvasSize, merged.faceX, merged.faceY, merged.faceSize, Math.max(20, Math.floor(feather * 0.7)));
        usedInverseMaskFlow = true;
      } catch (e) {
        console.warn("Canvas flow failed (initial):", e);
        mergedPreviewDataUrl = null;
        maskDataUrl = null;
        usedInverseMaskFlow = false;
      }
    }

    // build replicate input depending on flow
    const modelVersion = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

    // helper to call replicate with specified payload (wrapped for try/catch + debug)
    async function callReplicate(payload: any) {
      console.log("Calling replicate with keys:", Object.keys(payload));
      const out = await replicate.run(modelVersion, { input: payload });
      console.log("Replicate raw output (truncated):", JSON.stringify(out).slice(0, 1200));
      return out;
    }

    // prepare first attempt input
    let inputPayload: any = {};
    let promptText: string | string[] = ""; // <-- typed as string | string[]
    let negativeText = "";

    if (usedInverseMaskFlow && mergedPreviewDataUrl && maskDataUrl) {
      promptText = buildInverseMaskPromptForRestyling();
      negativeText = "gore, blood, exposed organs, violent, sexual, nudity, disfigured, graphic, photorealactic";
      inputPayload = {
        image: mergedPreviewDataUrl,
        mask: maskDataUrl,
        prompt: promptText,
        negative_prompt: negativeText,
        prompt_strength: typeof userPromptStrength === "number" ? userPromptStrength : 0.65,
        num_inference_steps: typeof body.num_inference_steps === "number" ? body.num_inference_steps : 50,
        width: canvasSize,
        height: canvasSize,
        guidance_scale: typeof body.guidance_scale === "number" ? body.guidance_scale : 8.5,
        scheduler: "K_EULER_ANCESTRAL",
      };
    } else {
      // fallback: send pfpUrl directly with madlads prompt
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

    // attempt replicate call + intelligent retry on NSFW/safety or missing image
    let output: any = null;
    let finalDataUrl: string | null = null;
    let triedRetry = false;

    try {
      output = await callReplicate(inputPayload);
    } catch (err: any) {
      console.warn("Replicate call failed (initial):", err?.message ?? err);
      // detect NSFW/safety in error message
      const em = String(err?.message ?? "").toLowerCase();
      if ((em.includes("nsfw") || em.includes("safety") || em.includes("forbidden") || em.includes("blocked")) && !triedRetry) {
        // mark for retry
        triedRetry = true;
      } else {
        // other error => return with debug
        return NextResponse.json({ ok: false, error: String(err?.message ?? err), replicate_output: err }, { status: 500 });
      }
    }

    // if initial output exists, try to extract image
    if (!output) {
      // output missing (maybe error thrown) -> attempt retry flow
      // we will create a stronger blurred merged image (if canvas available) and lower prompt strength
      if (!triedRetry && hasCanvas) {
        triedRetry = true;
      }
    } else {
      // try extract from output
      const v = tryExtractImageVariant(output) || tryExtractImageVariant(output?.output) || tryExtractImageVariant(Array.isArray(output) ? output[0] : null);
      if (v && v.type === "data" && v.value) {
        finalDataUrl = v.value;
      } else if (v && v.type === "url" && v.value) {
        finalDataUrl = await fetchImageAsDataUrl(v.value);
      } else {
        // no direct image found -> consider retry if allowed
        // sometimes the safety filter returns a structured error but no exception
        const sOut = JSON.stringify(output || "");
        if ((/nsfw|safety|blocked|forbidden|refused/i).test(sOut) && !triedRetry) {
          triedRetry = true;
        }
      }
    }

    // RETRY LOGIC: if we didn't get finalDataUrl and we haven't retried yet, attempt 1 retry with stronger blur + weaker prompt_strength + stronger negative
    if (!finalDataUrl && triedRetry) {
      console.log("Performing retry: stronger blur + weaker prompt_strength + stricter negative");
      try {
        // if canvas available, recreate merged preview with stronger blur
        if (hasCanvas) {
          // increase thumbFactor => stronger blur (e.g., 20 -> 30)
          usedThumbFactor = 20;
          const faceCanvasRetry = await createFeatheredFaceCanvas(pfpUrl, faceDiameter, feather, usedThumbFactor);
          const mergedRetry = await mergeStyleWithFace(styleUrl, faceCanvasRetry, { canvasSize });
          mergedPreviewDataUrl = mergedRetry.dataUrl;
          maskDataUrl = createInverseMaskDataUrlForChangeFace(canvasSize, mergedRetry.faceX, mergedRetry.faceY, mergedRetry.faceSize, Math.max(20, Math.floor(feather * 0.7)));
          usedInverseMaskFlow = true;

          // change inputPayload to use mergedRetry + mask + lower strength
          promptText = buildInverseMaskPromptForRestyling();
          negativeText = "gore, blood, exposed organs, violent, sexual, nudity, disfigured, graphic, photorealactic";
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
          // no canvas available: fallback to sending PFP with stricter negative and lower strength
          const p = buildMadLadsPrompt();
          promptText = p.prompt;
          negativeText = "gore, blood, exposed organs, violent, sexual, nudity, disfigured, graphic, photorealactic";
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

        // call replicate again
        const outRetry = await callReplicate(inputPayload);
        output = outRetry;

        // attempt to extract image
        const v2 = tryExtractImageVariant(output) || tryExtractImageVariant(output?.output) || tryExtractImageVariant(Array.isArray(output) ? output[0] : null);
        if (v2 && v2.type === "data" && v2.value) {
          finalDataUrl = v2.value;
        } else if (v2 && v2.type === "url" && v2.value) {
          finalDataUrl = await fetchImageAsDataUrl(v2.value);
        } else {
          // attempt regex find in JSON
          try {
            const s = JSON.stringify(output || "");
            const m = s.match(/https?:\/\/[^"\s}]+?\.(png|jpg|jpeg)/i);
            if (m) {
              finalDataUrl = await fetchImageAsDataUrl(m[0]);
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        console.warn("Retry replicate call failed:", e);
        // keep output as last known error/response
      }
    }

    // final response: include merged preview, replicate raw output, and final data url if any
    return NextResponse.json({
      ok: true,
      merged_preview: mergedPreviewDataUrl,
      replicate_output: output,
      final_image_data_url: finalDataUrl,
      debug: {
        usedInverseMaskFlow,
        usedThumbFactor,
        prompt_used: Array.isArray(promptText) ? promptText.join(" ") : String(promptText),
      },
    });
  } catch (err: any) {
    console.error("generate-art error:", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
