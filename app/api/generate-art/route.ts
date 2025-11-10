export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// 🐱 BASE CHARACTER
const BASE_CHARACTER = "cute chubby cartoon cat character";

// 🎨 Skin colors (20 options!)
const COLORS = [
  "gray and white",
  "orange tabby",
  "black",
  "white",
  "cream beige",
  "brown",
  "blue gray",
  "silver gray",
  "golden yellow",
  "pink",
  "purple",
  "teal blue",
  "mint green",
  "lavender",
  "peach orange",
  "red",
  "tan brown",
  "calico multi",
  "tortoiseshell",
  "seal point"
];

// 🐯 Fur patterns (20 types!)
const FUR_PATTERNS = [
  "with detailed striped tabby fur pattern",
  "with realistic tiger stripes pattern",
  "with leopard spotted fur",
  "with cheetah spots",
  "with calico patches pattern",
  "with tuxedo black and white pattern",
  "with tortoiseshell mottled pattern",
  "with siamese point markings",
  "with spotted dalmatian pattern",
  "with marble swirl pattern",
  "with mackerel tabby stripes",
  "with rosette spots pattern",
  "with bicolor split pattern",
  "with brindle pattern",
  "with solid smooth fur",
  "with fluffy thick fur texture",
  "with short sleek fur",
  "with long fluffy fur",
  "with spotted bengal pattern",
  "with ombre gradient fur"
];

// 👒 Head accessories (40 options!!!)
const HEAD_ITEMS = [
  "wearing tall white chef hat",
  "wearing golden crown with jewels",
  "wearing red baseball cap",
  "wearing snapback backwards",
  "wearing knit beanie",
  "wearing brown cowboy hat",
  "wearing black pirate tricorn hat",
  "wearing purple wizard pointy hat with stars",
  "wearing black top hat",
  "wearing viking helmet with horns",
  "wearing green military helmet",
  "wearing santa red hat with white trim",
  "wearing colorful party cone hat",
  "wearing wide sombrero",
  "wearing stylish fedora",
  "wearing red bandana",
  "wearing flower crown with roses",
  "wearing leaf crown headband",
  "wearing over-ear headphones",
  "wearing glowing halo",
  "wearing propeller beanie",
  "wearing french beret",
  "wearing safari explorer hat",
  "wearing yellow hard hat",
  "wearing straw sun hat",
  "wearing bucket hat",
  "wearing sports visor cap",
  "wearing turban wrap",
  "wearing bunny ears headband",
  "wearing cat ears headband",
  "wearing tiara crown",
  "wearing construction helmet",
  "wearing graduation cap",
  "wearing astronaut helmet",
  "wearing knight helmet",
  "wearing devil horns",
  "wearing angel halo wings",
  "wearing birthday hat",
  "wearing winter earmuffs",
  "no hat, natural head"
];

// 😎 Eye accessories (25 options!)
const EYE_ITEMS = [
  "wearing thick black sunglasses",
  "wearing gold aviator sunglasses",
  "wearing round hipster glasses",
  "wearing red 3D glasses",
  "wearing ski snow goggles",
  "wearing fancy monocle on one eye",
  "wearing pink heart sunglasses",
  "wearing yellow star sunglasses",
  "wearing nerd glasses with tape",
  "wearing futuristic visor",
  "wearing black eye patch pirate",
  "wearing safety yellow goggles",
  "wearing blue light glasses",
  "wearing rainbow lens glasses",
  "wearing steampunk goggles",
  "wearing cat eye vintage glasses",
  "wearing reading glasses",
  "wearing sports wrap sunglasses",
  "wearing LED cyber glasses",
  "wearing diamond bling glasses",
  "wearing mask superhero style",
  "wearing VR headset",
  "wearing diving mask",
  "wearing welding goggles",
  "no eyewear, natural bright eyes"
];

// 👄 Mouth accessories (20 options!)
const MOUTH_ITEMS = [
  "smoking brown cigar",
  "smoking wooden pipe with smoke",
  "holding red lollipop candy",
  "chewing pink bubble gum bubble",
  "holding red rose in teeth",
  "wearing white face mask",
  "blowing colorful party horn",
  "eating hot pizza slice with cheese",
  "holding rainbow popsicle",
  "drinking juice box with straw",
  "whistling with musical notes",
  "eating pink frosted donut",
  "eating ice cream cone",
  "holding wooden toothpick",
  "holding straw hat",
  "eating burger",
  "eating hot dog",
  "holding candy cane",
  "eating cookie",
  "normal happy smile"
];

// 👕 Clothing (35 options!!!)
const CLOTHING = [
  "wearing white chef coat with buttons and pockets",
  "wearing black leather jacket with zippers",
  "wearing cool hoodie with drawstrings",
  "wearing sports jersey with number on front",
  "wearing brown leather jacket",
  "wearing varsity jacket with patches",
  "wearing plain t-shirt",
  "wearing tank top",
  "wearing cozy sweater",
  "wearing formal suit and tie",
  "wearing tuxedo with bowtie",
  "wearing white lab coat with pens",
  "wearing colorful apron",
  "wearing red superhero cape flowing",
  "wearing winter puffy coat",
  "wearing Hawaiian floral shirt",
  "wearing black ninja outfit",
  "wearing cowboy vest with star",
  "wearing shiny armor knight",
  "wearing basketball uniform",
  "wearing football jersey",
  "wearing blue overalls",
  "wearing polo shirt with collar",
  "wearing flannel plaid shirt",
  "wearing denim jacket",
  "wearing dress shirt",
  "wearing tracksuit",
  "wearing rain coat",
  "wearing bomber jacket",
  "wearing kimono robe",
  "wearing bathrobe",
  "wearing vest with bow tie",
  "wearing referee shirt stripes",
  "wearing doctor coat",
  "no clothing, natural fur"
];

// ⛓️ Neck accessories (20 options!)
const NECK_ITEMS = [
  "wearing thick gold chain necklace",
  "wearing diamond necklace sparkling",
  "wearing pearl necklace elegant",
  "wearing dog tag chain",
  "wearing red bow tie",
  "wearing blue necktie",
  "wearing red scarf flowing",
  "wearing spiked collar punk",
  "wearing large medallion pendant",
  "wearing bandana around neck",
  "wearing choker necklace",
  "wearing lei flower necklace",
  "wearing cross necklace",
  "wearing pocket watch chain",
  "wearing bell collar cat",
  "wearing name tag badge",
  "wearing whistle on chain",
  "wearing key pendant",
  "wearing chain with lock",
  "no neck accessory"
];

// 🏆 Hand items (40 options!!!)
const HAND_ITEMS = [
  "holding wooden baseball bat",
  "holding shiny golden trophy high",
  "holding orange basketball",
  "holding brown football",
  "holding white soccer ball",
  "holding tennis racket",
  "holding black video game controller",
  "holding smartphone texting",
  "holding silver microphone singing",
  "holding magic wand with star",
  "holding silver sword warrior",
  "holding medieval shield",
  "holding thick book reading",
  "holding ice cream cone dripping",
  "holding red rose flower",
  "holding colorful balloons",
  "holding skateboard",
  "holding electric guitar",
  "holding stack of cash money",
  "holding brown briefcase",
  "holding coffee cup steaming",
  "holding soda can",
  "holding pizza slice with cheese",
  "holding burger with lettuce",
  "holding hot dog",
  "holding wrench tool",
  "holding paint brush painting",
  "holding camera taking photo",
  "holding fishing rod",
  "holding lightsaber glowing",
  "holding dart",
  "holding drumsticks",
  "holding bow and arrow",
  "holding binoculars",
  "holding telescope",
  "holding magnifying glass",
  "holding flag waving",
  "holding torch fire",
  "making peace sign gesture V",
  "hands on hips confidently"
];

// 🎨 Background colors (15 options)
const BACKGROUNDS = [
  "soft mint green",
  "pastel baby blue",
  "warm cream beige",
  "cool slate gray",
  "dusty rose pink",
  "pale butter yellow",
  "light lavender purple",
  "soft peach orange",
  "light teal aqua",
  "warm tan brown",
  "cool navy blue",
  "dark charcoal gray",
  "ivory white",
  "sage green",
  "powder blue"
];

// 😊 Facial expressions (15 options!)
const EXPRESSIONS = [
  "huge happy smile showing teeth",
  "cool confident smirk winking",
  "silly goofy grin laughing",
  "cute shy smile with blush cheeks",
  "excited surprised face wide eyes",
  "laughing joyful expression",
  "friendly warm smile welcoming",
  "playful winking one eye",
  "gentle kind smile soft",
  "cheeky mischievous grin scheming",
  "proud confident look powerful",
  "relaxed chill expression cool",
  "tongue out silly playful",
  "smiling with closed eyes happy",
  "sweet innocent adorable look"
];

// 🎭 Extra details (10 options!)
const EXTRA_DETAILS = [
  "with kawaii anime style eyes sparkling",
  "with realistic detailed fur texture visible",
  "with cute chibi proportions round",
  "with professional mascot design quality",
  "with detailed shading and highlights",
  "with glossy smooth cartoon rendering",
  "with thick black outlines clean",
  "with soft pastel colors aesthetic",
  "with vibrant bright colors saturated",
  "with cute chubby cheeks adorable"
];

function getRandomElement(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt() {
  const color = getRandomElement(COLORS);
  const pattern = getRandomElement(FUR_PATTERNS);
  const headItem = getRandomElement(HEAD_ITEMS);
  const eyeItem = getRandomElement(EYE_ITEMS);
  const mouthItem = getRandomElement(MOUTH_ITEMS);
  const clothing = getRandomElement(CLOTHING);
  const neckItem = getRandomElement(NECK_ITEMS);
  const handItem = getRandomElement(HAND_ITEMS);
  const background = getRandomElement(BACKGROUNDS);
  const expression = getRandomElement(EXPRESSIONS);
  const extraDetail = getRandomElement(EXTRA_DETAILS);
  
  const prompt = [
    "professional cute cartoon mascot character illustration, high quality NFT art",
    `adorable ${BASE_CHARACTER} with ${color} ${pattern}`,
    `${expression}, big expressive googly eyes`,
    `${headItem}`,
    `${eyeItem}`,
    `${mouthItem}`,
    `${clothing}`,
    `${neckItem}`,
    `${handItem}`,
    "chubby round body shape, standing upright centered pose",
    `${extraDetail}`,
    "thick black outlines, clean vector art style, smooth cel shading",
    "detailed fur texture visible, professional studio lighting",
    `solid ${background} background color`,
    "masterpiece quality, trending on ArtStation, ultra detailed, sharp focus, 8K quality"
  ].join(", ");

  const negative = [
    "realistic, photorealistic, photograph, 3D render, CGI, hyperrealistic",
    "blurry, distorted, ugly, deformed, bad anatomy, disfigured, mutated, malformed",
    "text, watermark, logo, signature, frame, border, caption, words, letters",
    "multiple characters, cropped, cut off, incomplete, human, scary, horror, dark",
    "pixel art, low quality, messy, sketchy, draft, unfinished, amateur, bad art",
    "duplicate, error, jpeg artifacts, low resolution, worst quality"
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
    console.log("🐱 Generating ULTRA DETAILED cat...");
    
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
            num_inference_steps: 50,  // 🔥 MORE STEPS = MORE DETAIL!
            guidance_scale: 7.5,       // 🔥 STRONGER PROMPT FOLLOWING!
            negative_prompt: negative,
          },
        });
        break;
      } catch (e: any) {
        lastErr = e;
        if (i < 2) {
          await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
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
