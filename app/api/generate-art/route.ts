export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// 🐱 FIXED BASE CHARACTER - CUTE CAT!
const BASE_CHARACTER = "cute chubby cartoon cat";

// 🐯 Skin colors (15 options)
const COLORS = [
  "bright yellow",
  "lime green",
  "orange",
  "tan brown",
  "cream white",
  "gray",
  "light blue",
  "pink",
  "purple",
  "red",
  "golden yellow",
  "teal",
  "mint green",
  "peach",
  "lavender"
];

// 🐯 Skin patterns (12 types)
const PATTERNS = [
  "with bold tiger stripes",
  "with zebra black stripes",
  "with leopard spots",
  "with cheetah spots",
  "with tabby stripes",
  "with calico patches",
  "with tuxedo pattern",
  "with spotted pattern",
  "smooth solid color",
  "with tiger stripe pattern",
  "with gradient shading",
  "with tortoiseshell pattern"
];

// 👒 Head accessories (30 options!)
const HEAD_ITEMS = [
  "wearing white chef hat",
  "wearing golden crown",
  "wearing baseball cap",
  "wearing snapback backwards",
  "wearing beanie",
  "wearing cowboy hat",
  "wearing pirate hat",
  "wearing wizard hat",
  "wearing top hat",
  "wearing viking helmet",
  "wearing military helmet",
  "wearing santa hat",
  "wearing party hat",
  "wearing sombrero",
  "wearing fedora",
  "wearing bandana",
  "wearing flower crown",
  "wearing leaf crown",
  "wearing headphones",
  "wearing halo",
  "wearing propeller beanie",
  "wearing beret",
  "wearing safari hat",
  "wearing hard hat",
  "wearing straw hat",
  "wearing bucket hat",
  "wearing visor cap",
  "wearing turban",
  "wearing bunny ears headband",
  "no hat"
];

// 😎 Eye accessories (20 options)
const EYE_ITEMS = [
  "wearing thick purple sunglasses",
  "wearing aviator sunglasses",
  "wearing round glasses",
  "wearing 3D glasses",
  "wearing ski goggles",
  "wearing monocle",
  "wearing heart sunglasses",
  "wearing star sunglasses",
  "wearing nerd glasses",
  "wearing futuristic visor",
  "wearing eye patch",
  "wearing safety goggles",
  "wearing blue light glasses",
  "wearing rainbow glasses",
  "wearing steampunk goggles",
  "wearing cat eye glasses",
  "wearing reading glasses",
  "wearing sports sunglasses",
  "wearing LED cyber glasses",
  "no eyewear"
];

// 👄 Mouth accessories (15 options)
const MOUTH_ITEMS = [
  "smoking cigar",
  "smoking pipe",
  "holding lollipop",
  "chewing bubble gum",
  "holding rose in teeth",
  "wearing face mask",
  "blowing party horn",
  "eating pizza slice",
  "holding popsicle",
  "drinking juice box",
  "whistling",
  "eating donut",
  "eating ice cream",
  "holding toothpick",
  "normal cute smile"
];

// 👕 Clothing (25 options)
const CLOTHING = [
  "wearing white chef coat with buttons",
  "wearing black hoodie",
  "wearing sports jersey with number",
  "wearing leather jacket",
  "wearing varsity jacket",
  "wearing t-shirt",
  "wearing tank top",
  "wearing sweater",
  "wearing suit and tie",
  "wearing tuxedo with bowtie",
  "wearing lab coat",
  "wearing apron",
  "wearing superhero cape",
  "wearing winter coat",
  "wearing Hawaiian shirt",
  "wearing ninja outfit",
  "wearing cowboy vest",
  "wearing armor",
  "wearing basketball uniform",
  "wearing football jersey",
  "wearing overalls",
  "wearing polo shirt",
  "wearing flannel shirt",
  "wearing denim jacket",
  "no clothing"
];

// ⛓️ Neck accessories (15 options)
const NECK_ITEMS = [
  "wearing thick gold chain",
  "wearing diamond necklace",
  "wearing pearl necklace",
  "wearing dog tag chain",
  "wearing bow tie",
  "wearing red necktie",
  "wearing colorful scarf",
  "wearing spiked collar",
  "wearing medallion",
  "wearing bandana around neck",
  "wearing choker necklace",
  "wearing lei flowers",
  "wearing cross necklace",
  "wearing pocket watch chain",
  "no neck accessory"
];

// 🏆 Hand items (30 options!)
const HAND_ITEMS = [
  "holding wooden baseball bat",
  "holding golden trophy",
  "holding basketball",
  "holding football",
  "holding soccer ball",
  "holding tennis racket",
  "holding video game controller",
  "holding smartphone",
  "holding microphone",
  "holding magic wand",
  "holding sword",
  "holding shield",
  "holding book",
  "holding ice cream cone",
  "holding red rose",
  "holding balloon",
  "holding skateboard",
  "holding guitar",
  "holding money stack",
  "holding briefcase",
  "holding coffee cup",
  "holding soda can",
  "holding pizza slice",
  "holding burger",
  "holding hot dog",
  "holding wrench tools",
  "holding paint brush",
  "holding camera",
  "making peace sign",
  "hands on hips"
];

// 🎨 Background colors (12 options)
const BACKGROUNDS = [
  "light mint green",
  "soft baby blue",
  "warm cream beige",
  "cool slate gray",
  "dusty rose pink",
  "pale yellow",
  "light lavender",
  "soft peach",
  "light teal",
  "warm tan",
  "cool navy blue",
  "dark charcoal"
];

// 😊 Facial expressions (12 options)
const EXPRESSIONS = [
  "huge happy smile with teeth showing",
  "cool confident smirk",
  "silly goofy grin",
  "cute shy smile with blush",
  "excited surprised face",
  "laughing joyful expression",
  "friendly warm smile",
  "playful winking",
  "gentle kind smile",
  "cheeky mischievous grin",
  "proud confident look",
  "relaxed chill expression"
];

function getRandomElement(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt() {
  const color = getRandomElement(COLORS);
  const pattern = getRandomElement(PATTERNS);
  const headItem = getRandomElement(HEAD_ITEMS);
  const eyeItem = getRandomElement(EYE_ITEMS);
  const mouthItem = getRandomElement(MOUTH_ITEMS);
  const clothing = getRandomElement(CLOTHING);
  const neckItem = getRandomElement(NECK_ITEMS);
  const handItem = getRandomElement(HAND_ITEMS);
  const background = getRandomElement(BACKGROUNDS);
  const expression = getRandomElement(EXPRESSIONS);
  
  const prompt = [
    "cute cartoon mascot illustration, adorable character design",
    `${BASE_CHARACTER} with ${color} fur ${pattern}`,
    `${expression}, big expressive googly eyes, cat ears`,
    `${headItem}`,
    `${eyeItem}`,
    `${mouthItem}`,
    `${clothing}`,
    `${neckItem}`,
    `${handItem}`,
    "chubby round body, standing upright pose, centered",
    "thick black outline, clean vector art style, smooth cel shading",
    `solid ${background} background, professional studio lighting`,
    "high quality NFT character art, clean rendering, mascot style"
  ].join(", ");

  const negative = [
    "realistic, photorealistic, photo, 3D render, CGI, hyperrealistic",
    "blurry, distorted, ugly, deformed, bad anatomy, disfigured, mutated",
    "text, watermark, logo, signature, frame, border, caption, words",
    "multiple characters, cropped, cut off, human, scary, horror, dark",
    "pixel art, low quality, messy, sketchy, draft, unfinished, amateur"
  ].join(", ");

  return { prompt, negative };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    if (!HF_TOKEN) {
      return NextResponse.json(
        { error: "Missing HUGGINGFACE_API_TOKEN" },
        { status: 500 }
      );
    }

    const { prompt, negative } = buildPrompt();
    console.log("🐱 Generating cat with random traits...");
    
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
            guidance_scale: 7.0,
            negative_prompt: negative,
          },
        });
        break;
      } catch (e: any) {
        lastErr = e;
        if (i < 2) {
          await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
        }
      }
    }

    if (!output) {
      const msg = lastErr?.message || "Inference error";
      const status = lastErr?.response?.status || 502;
      return NextResponse.json({ error: msg }, { status });
    }

    // Normalize output
    let imgBuf: Buffer;
    if (typeof output === "string") {
      if (output.startsWith("data:image")) {
        const b64 = output.split(",")[1] || "";
        imgBuf = Buffer.from(b64, "base64");
      } else if (output.startsWith("http")) {
        const r = await fetch(output);
        if (!r.ok) {
          return NextResponse.json(
            { error: `Fetch image failed: ${r.status}` },
            { status: 502 }
          );
        }
        imgBuf = Buffer.from(await r.arrayBuffer());
      } else {
        return NextResponse.json(
          { error: "Unexpected string output" },
          { status: 500 }
        );
      }
    } else if (output instanceof Blob) {
      imgBuf = Buffer.from(await output.arrayBuffer());
    } else {
      const maybeBlob = output?.blob || output?.image || output?.output;
      if (maybeBlob?.arrayBuffer) {
        imgBuf = Buffer.from(await maybeBlob.arrayBuffer());
      } else {
        return NextResponse.json(
          { error: "Unknown output format" },
          { status: 500 }
        );
      }
    }

    const dataUrl = `data:image/png;base64,${imgBuf.toString("base64")}`;

    return NextResponse.json({
      generated_image_url: dataUrl,
      success: true
    });

  } catch (e: any) {
    console.error("Route error:", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
