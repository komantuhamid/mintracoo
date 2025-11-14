// app/api/generate-art/route.ts
import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
// note: do NOT import @napi-rs/canvas at top-level to avoid webpack bundling .node binaries

export const runtime = "nodejs";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN ?? "",
});

const DEFAULT_STYLE_URL = process.env.STYLE_REFERENCE_URL ?? "";

/* ---------- NOTE ----------
 We declare placeholders for createCanvas/loadImage and types as `any`.
 They will be assigned at runtime inside the POST handler using require().
 This prevents Webpack from trying to parse .node binaries at build time.
------------------------------*/
let createCanvas: any = null;
let loadImage: any = null;

/* ---------- helper: create feathered face canvas (circle) ----------
   Uses createCanvas & loadImage variables (assigned at runtime)
--------------------------------------------------------------------*/
async function createFeatheredFaceCanvas(pfpUrl: string, faceDiameter: number, feather: number): Promise<any> {
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

  ctx.drawImage(pfpImg, dx, dy, dw, dh);

  // mask with radial gradient for feather
  const gd = ctx.createRadialGradient(size / 2, size / 2, faceDiameter / 2 - feather, size / 2, size / 2, faceDiameter / 2 + feather);
  gd.addColorStop(0, "rgba(0,0,0,1)");
  gd.addColorStop(0.9, "rgba(0,0,0,0.8)");
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

/* ---------- helper: merge style (MadLads) + faceCanvas ---------- */
async function mergeStyleWithFace(styleUrl: string, faceCanvas: any, opts?: { canvasSize?: number; faceX?: number; faceY?: number; }) {
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

/* ---------- helper: create inverse mask data URL ----------
   white = area to inpaint/change (hat/clothes/background)
   black = preserve (face)
   feather controls softness of the black hole edge
------------------------------------------------------------------ */
function createInverseMaskDataUrl(canvasSize: number, faceX: number, faceY: number, faceSize: number, feather = 32) {
  const m = createCanvas(canvasSize, canvasSize);
  const ctx = m.getContext("2d");

  // fill white (we will change everything by default)
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // carve black preserved face with feathered edge
  const cx = faceX + faceSize / 2;
  const cy = faceY + faceSize / 2;
  const innerR = Math.max(0, faceSize / 2 - Math.max(8, Math.floor(feather / 2)));
  const outerR = faceSize / 2 + Math.max(4, Math.floor(feather / 2));

  // draw black center (solid)
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  // feather ring: draw multiple rings with decreasing alpha
  const steps = Math.max(10, Math.ceil(feather / 3));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = innerR + t * (outerR - innerR);
    ctx.globalAlpha = 1 - t; // inner more opaque black, outer more transparent (so mask moves toward white)
    ctx.beginPath();
    ctx.fillStyle = "black";
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  return m.toDataURL("image/png");
}

/* ---------- POST handler ---------- */
export async function POST(req: NextRequest) {
  try {
    // runtime require: ensure @napi-rs/canvas is required at server runtime (not bundled)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const napiCanvas = require('@napi-rs/canvas');
    createCanvas = napiCanvas.createCanvas;
    loadImage = napiCanvas.loadImage;

    const body = await req.json();

    const pfpUrl: string = body.pfpUrl;
    if (!pfpUrl) return NextResponse.json({ error: "pfpUrl is required" }, { status: 400 });

    const styleUrl = body.styleUrl ?? DEFAULT_STYLE_URL;
    if (!styleUrl) return NextResponse.json({ error: "styleUrl missing and no DEFAULT_STYLE_URL configured" }, { status: 400 });

    // defaults (tweakable via body)
    const canvasSize = 1024;
    const faceDiameter = typeof body.faceDiameter === "number" ? body.faceDiameter : 520;
    const feather = typeof body.feather === "number" ? body.feather : 40;

    // 1) create feathered face canvas
    const faceCanvas = await createFeatheredFaceCanvas(pfpUrl, faceDiameter, feather);

    // 2) merge with style (MadLads) by pasting face onto style image
    const merged = await mergeStyleWithFace(styleUrl, faceCanvas, {
      canvasSize,
      faceX: typeof body.faceX === "number" ? body.faceX : undefined,
      faceY: typeof body.faceY === "number" ? body.faceY : undefined,
    });

    // 3) create inverse mask: keep face preserved (black), change everything else (white)
    const maskDataUrl = createInverseMaskDataUrl(canvasSize, merged.faceX, merged.faceY, merged.faceSize, Math.max(24, Math.floor(feather * 0.8)));

    // 4) enhanced prompt: keep MadLads linework/body, but recolor/restyle hat/clothes/background to match face skin/style
    const prompt = body.prompt ?? [
      // Preserve identity & body style
      "Preserve the original character's linework, pose, body proportions, and overall MadLads art style. Do not change the face identity or facial features.",
      // Change clothing/hat/background to harmonize with face
      "Recolor and restyle the hat, clothing, and background to harmonize and complement the face skin tone and facial color palette from the provided face reference.",
      "Change clothing textures and patterns subtly to match the face undertones; add small color accents that complement the facial palette.",
      "Convert hat color to a complementary hue and adjust its shading to fit the new clothing style, but keep hat shape and position consistent with reference.",
      "Keep clothing style visually consistent with MadLads (cartoon/comic linework, same level of detail), only update colors, textures, and patterns to match the face.",
      "Avoid altering the face, pose, body shape, or removing accessories; only modify hat, clothes, and background styling/colours to match the face."
    ].join(" ");

    const negative = body.negative ?? "do not change facial features, do not change body proportions, do not remove hat or clothing items, preserve original pose";

    const modelVersion = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

    // 5) call replicate with image + mask (inverse) and tuned strengths
    const output = await replicate.run(modelVersion, {
      input: {
        image: merged.dataUrl,
        mask: maskDataUrl,
        prompt,
        negative_prompt: negative,
        prompt_strength: typeof body.prompt_strength === "number" ? body.prompt_strength : 0.65, // fairly strong so clothes/bg change
        num_inference_steps: typeof body.num_inference_steps === "number" ? body.num_inference_steps : 50,
        width: canvasSize,
        height: canvasSize,
        guidance_scale: typeof body.guidance_scale === "number" ? body.guidance_scale : 8.0,
        scheduler: "K_EULER_ANCESTRAL",
      },
    });

    return NextResponse.json({ ok: true, replicate_output: output, debug: { faceX: merged.faceX, faceY: merged.faceY, faceSize: merged.faceSize } });
  } catch (err: any) {
    console.error("generate-art error:", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
