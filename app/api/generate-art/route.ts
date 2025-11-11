export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// 🐱 BASE CHARACTER - MALE/NEUTRAL
const BASE_CHARACTER = "cute chubby male cartoon cat boy character";

// 🎨 Body types (make them thick/fat like your examples!)
const BODY_TYPES = [
  "chubby thick body",
  "fat round body", 
  "plump chubby body",
  "thick chunky body",
  "chonky fat body",
  "round plump body"
];

// 🎨 Skin colors (20 options)
const COLORS = [
  "gray and white",
  "orange tabby",
  "ginger orange",
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
  "lavender purple",
  "peach orange",
  "red",
  "tan brown",
  "green",
  "yellow"
];

// 🐯 Fur patterns (18 types)
const FUR_PATTERNS = [
  "with detailed striped tabby fur",
  "with bold tiger stripes",
  "with leopard spotted fur",
  "with spotted pattern",
  "with calico patches",
  "with tuxedo black white pattern",
  "with tortoiseshell pattern",
  "with siamese points",
  "with dalmatian spots",
  "with marble swirl pattern",
  "with mackerel stripes",
  "with rosette spots",
  "with bicolor split",
  "with brindle pattern",
  "with smooth solid fur",
  "with fluffy thick fur",
  "with short sleek fur",
  "with ombre gradient fur"
];

// 👒 Head accessories (35 options)
const HEAD_ITEMS = [
  "wearing tall white chef hat",
  "wearing golden crown",
  "wearing red baseball cap",
  "wearing snapback cap backwards",
  "wearing blue snapback cap",
  "wearing knit beanie",
  "wearing cowboy hat",
  "wearing black pirate hat",
  "wearing purple wizard hat with stars",
  "wearing black top hat",
  "wearing viking helmet with horns",
  "wearing green military helmet",
  "wearing santa red hat",
  "wearing party cone hat",
  "wearing sombrero",
  "wearing fedora",
  "wearing red bandana headband",
  "wearing flower crown with pink roses",
  "wearing leaf crown",
  "wearing headphones",
  "wearing glowing halo above head",
  "wearing propeller beanie",
  "wearing french beret",
  "wearing safari hat",
  "wearing yellow hard hat",
  "wearing straw sun hat",
  "wearing bucket hat",
  "wearing visor cap",
  "wearing turban",
  "wearing bunny ears",
  "wearing tiara",
  "wearing graduation cap",
  "wearing astronaut helmet",
  "wearing winter earmuffs",
  "no hat"
];

// 😎 Eye accessories (22 options)
const EYE_ITEMS = [
  "wearing thick black sunglasses cool",
  "wearing gold aviator sunglasses",
  "wearing round hipster glasses",
  "wearing red 3D glasses",
  "wearing ski goggles",
  "wearing monocle on one eye",
  "wearing pink heart sunglasses",
  "wearing yellow star sunglasses",
  "wearing nerd glasses with tape",
  "wearing futuristic cyber visor",
  "wearing black eye patch pirate",
  "wearing safety yellow goggles",
  "wearing blue light gaming glasses",
  "wearing rainbow lens glasses",
  "wearing steampunk goggles brass",
  "wearing cat eye vintage glasses",
  "wearing reading glasses",
  "wearing sports wrap sunglasses",
  "wearing LED glowing glasses",
  "wearing diamond bling glasses",
  "wearing mask superhero",
  "no eyewear"
];

// 👄 Mouth accessories (18 options)
const MOUTH_ITEMS = [
  "smoking brown cigar in mouth",
  "smoking wooden pipe with smoke",
  "holding red lollipop candy stick",
  "chewing pink bubble gum with bubble",
  "holding red rose in teeth romantic",
  "wearing white face mask",
  "blowing party horn colorful",
  "eating hot pizza slice melting cheese",
  "holding rainbow popsicle ice cream",
  "drinking juice box with straw",
  "whistling with musical notes",
  "eating pink frosted donut with sprinkles",
  "eating ice cream cone dripping",
  "holding wooden toothpick cool",
  "eating burger with lettuce",
  "eating hot dog",
  "holding candy cane striped",
  "happy smile"
];

// 👕 Clothing (30 options) - MALE STYLE!
const CLOTHING = [
  "wearing white chef coat with buttons",
  "wearing black leather jacket cool",
  "wearing navy blue hoodie with pockets",
  "wearing sports jersey with number",
  "wearing brown bomber jacket",
  "wearing varsity jacket with patches",
  "wearing plain t-shirt casual",
  "wearing tank top",
  "wearing cozy sweater",
  "wearing formal suit and tie",
  "wearing tuxedo with black bowtie",
  "wearing white lab coat scientist",
  "wearing colorful apron cooking",
  "wearing red superhero cape flying",
  "wearing winter puffy jacket",
  "wearing Hawaiian floral shirt tropical",
  "wearing black ninja outfit stealth",
  "wearing cowboy vest with badge",
  "wearing shiny armor knight",
  "wearing basketball uniform sports",
  "wearing football jersey team",
  "wearing blue denim overalls",
  "wearing polo shirt with collar",
  "wearing flannel plaid shirt lumberjack",
  "wearing denim jean jacket",
  "wearing tracksuit athletic",
  "wearing bomber flight jacket",
  "wearing kimono robe japanese",
  "wearing vest with bowtie formal",
  "no clothing natural"
];

// ⛓️ Neck accessories (18 options)
const NECK_ITEMS = [
  "wearing thick gold chain necklace bling",
  "wearing diamond necklace sparkling",
  "wearing pearl necklace elegant",
  "wearing dog tag chain military",
  "wearing red bow tie dapper",
  "wearing blue striped necktie business",
  "wearing red scarf flowing winter",
  "wearing spiked collar punk rock",
  "wearing large gold medallion pendant",
  "wearing bandana around neck cowboy",
  "wearing black choker necklace",
  "wearing lei flower necklace hawaiian",
  "wearing silver cross necklace",
  "wearing pocket watch chain vintage",
  "wearing bell collar cat",
  "wearing name tag badge",
  "wearing whistle on chain sports",
  "no neck accessory"
];

// 🏆 HAND ITEMS - MUST HOLD CLEARLY! (35 options)
const HAND_ITEMS = [
  "clearly holding wooden baseball bat in both hands raised",
  "proudly holding shiny golden trophy cup high up",
  "holding orange basketball in one hand",
  "holding brown leather football in hands",
  "holding white soccer ball",
  "holding tennis racket grip visible",
  "holding black game controller playing",
  "holding smartphone texting with thumbs",
  "holding silver microphone singing performance",
  "holding magic wand with star tip glowing",
  "holding silver sword blade up warrior",
  "holding medieval shield defensive",
  "holding thick book reading pages visible",
  "holding ice cream cone with drips melting",
  "holding red rose flower romantic",
  "holding colorful balloons strings in hand",
  "holding skateboard deck under arm",
  "holding electric guitar by neck",
  "holding stack of cash money bills fanned",
  "holding brown briefcase handle grip",
  "holding steaming coffee cup mug warm",
  "holding soda can drink refreshing",
  "holding pizza slice with melted cheese stretchy",
  "holding burger with lettuce visible layers",
  "holding hot dog with mustard",
  "holding wrench tool mechanic",
  "holding paint brush painting artist",
  "holding camera taking photo",
  "holding fishing rod line cast",
  "holding glowing lightsaber energy blade",
  "holding dart aimed throw",
  "holding drumsticks crossed music",
  "holding bow with arrow ready aim",
  "making peace V sign gesture fingers clear",
  "hands on hips standing confident pose"
];

// 🎨 Background colors (14 options)
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
  "ivory white",
  "sage green",
  "powder blue"
];

// 😊 Facial expressions (14 options)
const EXPRESSIONS = [
  "huge happy smile showing teeth cheerful",
  "cool confident smirk winking one eye",
  "silly goofy grin laughing",
  "cute smile with rosy blush cheeks",
  "excited surprised face wide eyes amazed",
  "laughing joyful expression fun",
  "friendly warm smile welcoming kind",
  "playful winking one eye cheeky",
  "gentle kind smile soft sweet",
  "mischievous grin scheming playful",
  "proud confident look strong powerful",
  "relaxed chill expression cool calm",
  "tongue out silly playful cute",
  "sweet innocent adorable look"
];

function getRandomElement(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt() {
  const bodyType = getRandomElement(BODY_TYPES);
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
  
  const prompt = [
    "professional cute cartoon mascot character, high quality NFT digital art",
    `adorable ${BASE_CHARACTER} with ${color} ${pattern}`,
    `${bodyType}, ${expression}`,
    "big expressive googly kawaii eyes sparkling",
    `${headItem}`,
    `${eyeItem}`,
    `${mouthItem}`,
    `${clothing}`,
    `${neckItem}`,
    `${handItem}`,
    "standing upright centered pose, both hands clearly visible holding items",
    "detailed fur texture realistic visible strands, whiskers on face",
    "thick black outlines clean, smooth cel shading anime style",
    "professional studio lighting dramatic, sharp focus ultra detailed",
    `solid flat ${background} background simple clean`,
    "masterpiece quality trending artstation, 8K ultra HD, kawaii aesthetic cute"
  ].join(", ");

  const negative = [
    "female, girl, feminine, lady, woman, girly, female features",
    "realistic photo, photorealistic, 3D render, CGI, hyperrealistic",
    "blurry, distorted, ugly, deformed, bad anatomy, disfigured, mutated",
    "text, watermark, logo, signature, frame, border, words, letters",
    "multiple characters, cropped, cut off, incomplete, human person",
    "scary, horror, creepy, dark, evil, monster with sharp claws",
    "pixel art, low quality, messy, sketchy, draft, amateur, bad proportions",
    "empty hands, no items, hands behind back, missing hands, hidden hands"
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
    console.log("🐱 Generating MALE CAT with clear hands & items...");
    
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
            num_inference_steps: 50,
            guidance_scale: 8.0,  // 🔥 Even stronger prompt control!
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
