export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// 🔥 EXPANDED TRAITS - MASSIVE VARIETY!

// Base creatures (15 types)
const CREATURES = [
  "cute chubby dinosaur",
  "adorable round dragon",
  "lovable chubby monster",
  "friendly cartoon creature",
  "silly pudgy beast",
  "charming chubby alien",
  "cute fluffy monster",
  "adorable chunky critter",
  "playful chubby animal",
  "sweet round character",
  "funny plump monster",
  "cute baby dragon",
  "adorable fat lizard",
  "charming chubby reptile",
  "lovely round creature"
];

// Skin colors (20 options)
const SKIN_COLORS = [
  "bright green",
  "lime green",
  "forest green",
  "mint green",
  "olive green",
  "teal blue",
  "sky blue",
  "royal blue",
  "purple",
  "lavender",
  "pink",
  "hot pink",
  "orange",
  "red",
  "yellow",
  "brown",
  "tan",
  "gray",
  "black",
  "white"
];

// Skin patterns (15 types)
const PATTERNS = [
  "smooth solid color skin",
  "spotted pattern with dots all over body",
  "striped pattern with horizontal stripes",
  "vertical stripe pattern",
  "honeycomb hexagon pattern scales",
  "diamond scale pattern",
  "leopard spot pattern",
  "tiger stripe pattern",
  "camouflage pattern mix",
  "gradient fade pattern",
  "checkered square pattern",
  "polka dot pattern",
  "zebra stripe pattern",
  "giraffe spot pattern",
  "snake scale pattern"
];

// Head accessories (25 options!)
const HEAD_ITEMS = [
  "wearing golden royal crown",
  "wearing silver crown with jewels",
  "wearing baseball cap backwards",
  "wearing snapback hat",
  "wearing beanie hat",
  "wearing cowboy hat",
  "wearing pirate tricorn hat",
  "wearing wizard pointy hat",
  "wearing top hat",
  "wearing viking helmet with horns",
  "wearing military helmet",
  "wearing chef hat",
  "wearing santa hat",
  "wearing propeller beanie",
  "wearing flower crown",
  "wearing leaf crown headband",
  "wearing bandana headband",
  "wearing tiara crown",
  "wearing party hat",
  "wearing sombrero",
  "wearing fedora hat",
  "wearing beret",
  "wearing headphones",
  "wearing halo floating above head",
  "no hat, natural head"
];

// Eye accessories (15 options)
const EYE_ITEMS = [
  "wearing black thick frame sunglasses",
  "wearing cool aviator sunglasses",
  "wearing round hipster glasses",
  "wearing 3D red-blue glasses",
  "wearing ski goggles",
  "wearing monocle on one eye",
  "wearing heart-shaped sunglasses",
  "wearing star-shaped sunglasses",
  "wearing nerd glasses with tape",
  "wearing futuristic visor",
  "wearing eye patch pirate style",
  "wearing safety goggles",
  "wearing blue light gaming glasses",
  "wearing rainbow lens sunglasses",
  "no eyewear, natural eyes"
];

// Mouth accessories (12 options)
const MOUTH_ITEMS = [
  "smoking lit cigar in mouth",
  "smoking pipe in mouth",
  "holding lollipop candy",
  "chewing gum bubble",
  "holding rose in teeth",
  "wearing surgical mask",
  "blowing party horn",
  "eating pizza slice",
  "holding fork with food",
  "drinking juice box with straw",
  "whistling with mouth",
  "normal mouth, no items"
];

// Clothing (20 options)
const CLOTHING = [
  "wearing black hoodie with drawstrings",
  "wearing sports jersey with number",
  "wearing leather jacket",
  "wearing varsity jacket",
  "wearing t-shirt with logo",
  "wearing tank top",
  "wearing sweater",
  "wearing suit and tie",
  "wearing tuxedo with bowtie",
  "wearing lab coat",
  "wearing chef apron",
  "wearing superhero cape",
  "wearing winter coat",
  "wearing raincoat",
  "wearing overalls",
  "wearing Hawaiian shirt",
  "wearing ninja outfit",
  "wearing cowboy vest",
  "wearing armor",
  "no clothing, natural body"
];

// Neck accessories (10 options)
const NECK_ITEMS = [
  "wearing thick gold chain necklace",
  "wearing diamond chain necklace",
  "wearing pearl necklace",
  "wearing dog tag chain",
  "wearing bow tie",
  "wearing necktie",
  "wearing scarf",
  "wearing collar with spikes",
  "wearing medallion pendant",
  "no neck accessory"
];

// Hand items (18 options)
const HAND_ITEMS = [
  "holding basketball in hand",
  "holding football in hand",
  "holding soccer ball",
  "holding tennis racket",
  "holding baseball bat",
  "holding video game controller",
  "holding smartphone",
  "holding microphone",
  "holding magic wand",
  "holding sword",
  "holding shield",
  "holding book",
  "holding trophy",
  "holding ice cream cone",
  "holding balloon",
  "holding skateboard",
  "making peace sign gesture",
  "hands in natural pose"
];

// Background colors (12 options)
const BACKGROUNDS = [
  "light mint green solid background",
  "soft baby blue solid background",
  "warm cream beige solid background",
  "cool slate gray solid background",
  "dusty rose pink solid background",
  "pale yellow solid background",
  "light lavender purple solid background",
  "soft peach orange solid background",
  "light teal solid background",
  "warm tan solid background",
  "cool navy blue solid background",
  "dark charcoal solid background"
];

// Facial expressions (10 options)
const EXPRESSIONS = [
  "huge happy smile showing teeth",
  "wide grin with tongue out",
  "cool confident smirk",
  "silly goofy expression",
  "cute shy smile with blush",
  "excited surprised face",
  "laughing joyful face",
  "friendly warm smile",
  "playful winking expression",
  "gentle kind smile"
];

function getRandomElement(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt() {
  const creature = getRandomElement(CREATURES);
  const skinColor = getRandomElement(SKIN_COLORS);
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
    "cute cartoon character illustration, adorable mascot style",
    `${creature} with ${skinColor} skin, ${pattern}`,
    `${expression}, big expressive googly eyes`,
    `${headItem}`,
    `${eyeItem}`,
    `${mouthItem}`,
    `${clothing}`,
    `${neckItem}`,
    `${handItem}`,
    "chubby round body shape, standing upright, centered pose",
    "thick black outline, clean vector art, smooth cell shading",
    `${background}, professional studio lighting`,
    "high quality character design, NFT collection style, clean rendering"
  ].join(", ");

  const negative = [
    "realistic, photorealistic, photograph, 3D render, CGI",
    "blurry, distorted, ugly, deformed, bad anatomy, disfigured",
    "text, watermark, logo, signature, frame, border, caption",
    "multiple characters, cropped, cut off, human, scary, horror",
    "pixel art, low quality, messy, sketchy, draft, unfinished"
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
    console.log("🎨 Generating with mega traits...");
    
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
