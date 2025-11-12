export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// ستايل البطريق الرسمي فقط الوجه/bust (قاعدة صارمة)
const BASE_CHARACTER =
  "minimal cute cartoon penguin, big oval eyes, centered orange beak, rounded white face, bust only (shoulders and head), NO arms, NO legs, NO full body shown, flat solid color background";

const PENGUIN_COLOR_SCHEMES = [
  { bg: "orange" }, { bg: "yellow" }, { bg: "purple" }, { bg: "blue" },
  { bg: "mint green" }, { bg: "ice blue" }, { bg: "pink" }, { bg: "pastel green" },
  { bg: "pastel yellow" }, { bg: "beige" }
];

const HEAD_ITEMS = [
  "small leather cap on top of head", "beanie knit cap on head",
  "beret tilted on head", "simple blue flat cap on head"
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt() {
  const background = getRandomElement(PENGUIN_COLOR_SCHEMES).bg;
  const headItem = getRandomElement(HEAD_ITEMS); // قبعة اختيارية فقط
  const prompt = [
    BASE_CHARACTER,
    headItem,
    `solid ${background} background`
  ]
    .filter(Boolean)
    .join(", ");
  const negative = [
    "arms, legs, feet, hands, full body, body, complex background, scene, objects, text, watermark, signature, clothing on body"
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
    console.log("🎨 Generating Penguin Bust NFT...");
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
