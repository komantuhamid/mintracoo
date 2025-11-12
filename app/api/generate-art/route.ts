export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// فقط bust or head لبطريق minimal
const BASE_CHARACTER =
  "minimal cute cartoon penguin bust, big oval eyes, centered orange beak, rounded white face, bust only (shoulders and head), NO arms, NO legs, NO full body, flat solid color background";

const PENGUIN_COLOR_SCHEMES = [
  { bg: "orange" }, { bg: "yellow" }, { bg: "blue" }, { bg: "mint green" }, { bg: "pastel green" }, { bg: "lavender" }, { bg: "ice blue" }, { bg: "pink" }
];

const HEAD_ITEMS = [
  "blue flat cap on head", "beanie cap on head", "beret on head"
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt() {
  const background = getRandomElement(PENGUIN_COLOR_SCHEMES).bg;
  const headItem = getRandomElement(HEAD_ITEMS); // قبعة فقط إذا بغيت اكسسوار
  const prompt = [
    BASE_CHARACTER,
    headItem,
    `solid ${background} background`
  ].filter(Boolean).join(", ");

  const negative = [
    "arms, legs, feet, hands, body, clothing, full body, stand, shadow, objects under bust, torso, scene, accessories except head, all under bust"
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
        if (i < 2) await new Promise((r) => setTimeout(r, 1300 * (i + 1)));
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
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
