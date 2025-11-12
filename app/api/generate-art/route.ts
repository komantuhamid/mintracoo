export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// ✅ Penguin Portrait Logic
const BASE_CHARACTER =
  "stylized chubby penguin, rounded white belly, small orange beak, minimal details, smooth body, clean cartoon mascot, NO visible arms, NO visible legs, NO full body";

// Monochrome color schemes (pick for background)
const PENGUIN_COLOR_SCHEMES = [
  { bg: "orange" }, { bg: "yellow" }, { bg: "purple" }, { bg: "blue" },
  { bg: "mint green" }, { bg: "ice blue" }, { bg: "pink" }, { bg: "pastel green" },
  { bg: "pastel yellow" }, { bg: "beige" }
];

// Accessories (randomized)
const HEAD_ITEMS = [
  "small leather cap on head", "tiny metal helmet", "bandana", "mohawk", "beanie knit cap",
  "beret tilted on head", "chef hat", "baseball cap", "bucket hat", "party hat cone",
  "helmet shaped like fish", "fur hat", "cowboy hat", "pirate hat", "top hat tall"
];

const EYE_ITEMS = [
  "small monocle over one eye", "round glasses", "tiny goggles", "sunglasses", "ski goggles",
  "heart-shaped glasses", "star-shaped sunglasses"
];

const CLOTHING = [
  "denim jacket", "hoodie", "basketball jersey", "scarf wrapped around neck", "tuxedo jacket",
  "hawaiian shirt", "tracksuit jacket", "sweater knitted", "football jersey", "tank top"
];

const NECK_ITEMS = [
  "small bead necklace", "bow tie", "scarf wrapped around neck", "diamond necklace", "bare neck"
];

// Helper (TypeScript-safe)
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 🐧 Prompt Construction (Pudgy Penguin Portrait Style)
function buildPrompt() {
  const background = getRandomElement(PENGUIN_COLOR_SCHEMES).bg;
  const headItem = getRandomElement(HEAD_ITEMS);
  const eyeItem = getRandomElement(EYE_ITEMS);
  const clothing = getRandomElement(CLOTHING);
  const neckItem = getRandomElement(NECK_ITEMS);

  // Main positive prompt
  const prompt = [
    "simple flat 2D cartoon illustration, clean vector art style, thick black outlines, bold cartoon lines, simple coloring",
    `${BASE_CHARACTER}`,
    "portrait crop, shoulders and head only, UPPER BODY, NO visible arms, NO visible legs, NO feet, full body NOT shown, centered, front-facing",
    `${headItem}`,
    `${eyeItem}`,
    `${neckItem}`,
    `${clothing}`,
    `solid ${background} background fills entire image`,
    "no complex scenery, no shadows, no patterns, no gradients, only flat color background"
  ].join(", ");

  // Strong negatives
  const negative = [
    "3D render, CGI, realistic, photorealistic, detailed, shading, shadows, full body, arms, hands, legs, feet, multiple characters, background scenery, objects, landscape, text, watermark, signature, side view, profile, turned, cropped, back view"
  ].join(", ");

  return { prompt, negative };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!HF_TOKEN) {
      return NextResponse.json({ error: "Missing HUGGINGFACE_API_TOKEN" }, { status: 500 });
    }
    const { prompt, negative } = buildPrompt();
    console.log("🎨 Generating Penguin Portrait NFT...");
    const hf = new HfInference(HF_TOKEN);

    let output: any = null;
    let lastErr: any = null;
    for (let i = 0; i < 3; i++) {
      try {
        output = await (hf.textToImage as any)({
          inputs: prompt,
          model: MODEL_ID,
          provider: PROVIDER,
          parameters: {
            width: 1024,
            height: 1024,
            num_inference_steps: 35,
            guidance_scale: 7.5,
            negative_prompt: negative,
          },
        });
        break;
      } catch (e: any) {
        lastErr = e;
        if (i < 2) await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
      }
    }
    if (!output) {
      const msg = lastErr?.message || "Inference error";
      const status = lastErr?.response?.status || 502;
      return NextResponse.json({ error: msg }, { status });
    }

    let imgBuf: Buffer;
    if (typeof output === "string") {
      if (output.startsWith("data:image")) {
        const b64 = output.split(",")[1] || "";
        imgBuf = Buffer.from(b64, "base64");
      } else if (output.startsWith("http")) {
        const r = await fetch(output);
        if (!r.ok) {
          return NextResponse.json({ error: `Fetch image failed: ${r.status}` }, { status: 502 });
        }
        imgBuf = Buffer.from(await r.arrayBuffer());
      } else {
        return NextResponse.json({ error: "Unexpected string output" }, { status: 500 });
      }
    } else if (output instanceof Blob) {
      imgBuf = Buffer.from(await output.arrayBuffer());
    } else {
      const maybeBlob = output?.blob || output?.image || output?.output;
      if (maybeBlob?.arrayBuffer) {
        imgBuf = Buffer.from(await maybeBlob.arrayBuffer());
      } else {
        return NextResponse.json({ error: "Unknown output format" }, { status: 500 });
      }
    }
    const dataUrl = `data:image/png;base64,${imgBuf.toString("base64")}`;
    return NextResponse.json({ generated_image_url: dataUrl, success: true });

  } catch (e: any) {
    console.error("Route error:", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
