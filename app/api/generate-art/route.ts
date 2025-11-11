export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// 🧌 BASE CHARACTER - FAT CHUNKY STYLE!
const BASE_CHARACTER = "chubby fat round goblin monster creature";

// 🧌 Goblin skin colors (12 options)
const SKIN_COLORS = [
  "bright green",
  "dark green",
  "lime green",
  "olive green",
  "yellow-green",
  "gray-green",
  "orange",
  "red",
  "purple",
  "blue",
  "gray",
  "brown"
];

// 👒 Head items (25 options)
const HEAD_ITEMS = [
  "wearing leather cap",
  "wearing metal helmet",
  "wearing cloth hood",
  "wearing bandana",
  "wearing bone helmet",
  "wearing iron crown",
  "wearing bucket hat",
  "wearing feather headdress",
  "wearing wizard hat",
  "wearing fur hat",
  "wearing chain mail hood",
  "wearing wooden mask",
  "wearing mushroom cap",
  "wearing horned helmet",
  "wearing goggles",
  "wearing skull cap",
  "wearing bronze crown",
  "wearing straw hat",
  "wearing jester hat",
  "wearing pointed hood",
  "wearing antler crown",
  "wearing war paint",
  "wearing scrap helmet",
  "wearing animal pelt",
  "bald goblin head"
];

// 👀 Eye items (14 options)
const EYE_ITEMS = [
  "wearing eye patch",
  "wearing goggles",
  "wearing monocle",
  "wearing round glasses",
  "wearing bone glasses",
  "wearing scrap goggles",
  "wearing bandage over eye",
  "wearing face paint",
  "wearing iron visor",
  "wearing mechanical eye",
  "wearing mask",
  "wearing aviator goggles",
  "wearing blindfold",
  "large yellow eyes"
];

// 👄 Mouth items (12 options)
const MOUTH_ITEMS = [
  "smoking wooden pipe",
  "holding rat in teeth",
  "smoking cigar",
  "chewing bone",
  "holding dagger in teeth",
  "smoking clay pipe",
  "chewing leather",
  "holding coin in mouth",
  "biting rope",
  "smoking mushroom pipe",
  "holding key in teeth",
  "grinning showing fangs"
];

// 👕 Clothing (25 options)
const CLOTHING = [
  "wearing leather vest",
  "wearing torn rags",
  "wearing cloth tunic",
  "wearing chain mail",
  "wearing fur vest",
  "wearing leather jerkin",
  "wearing torn robes",
  "wearing scale armor",
  "wearing burlap tunic",
  "wearing patchwork leather",
  "wearing animal hide",
  "wearing torn shirt",
  "wearing iron armor",
  "wearing torn cloak",
  "wearing leather coat",
  "wearing pirate vest",
  "wearing prisoner rags",
  "wearing leather apron",
  "wearing stolen doublet",
  "wearing monk robes",
  "wearing bandit leather",
  "wearing scrap armor",
  "wearing bone armor",
  "wearing sailor vest",
  "bare chest"
];

// ⛓️ Neck items (12 options)
const NECK_ITEMS = [
  "wearing bone necklace",
  "wearing iron collar",
  "wearing tooth necklace",
  "wearing leather cord",
  "wearing gold chain",
  "wearing bead necklace",
  "wearing rope",
  "wearing bronze medallion",
  "wearing fur collar",
  "wearing spiked collar",
  "wearing skull pendant",
  "bare neck"
];

// 🗡️ Hand items (28 options)
const HAND_ITEMS = [
  "holding rusty dagger",
  "holding wooden club",
  "holding coin bag",
  "holding wooden shield",
  "holding crossbow",
  "holding torch",
  "holding battle axe",
  "holding shortsword",
  "holding iron mace",
  "holding wooden spear",
  "holding bow and arrow",
  "holding loot sack",
  "holding lantern",
  "holding skull cup",
  "holding potion vial",
  "holding bomb",
  "holding chain weapon",
  "holding pickaxe",
  "holding rope",
  "holding meat leg",
  "holding chicken",
  "holding fish",
  "holding mushroom",
  "holding treasure chest",
  "holding keys",
  "holding map scroll",
  "holding bottle",
  "clenched fist"
];

// 🎨 Background colors (10 options) - SOLID FLAT COLORS!
const BACKGROUNDS = [
  "solid bright green",
  "solid dark green",
  "solid brown",
  "solid gray",
  "solid dark blue",
  "solid purple",
  "solid orange",
  "solid red",
  "solid teal",
  "solid olive"
];

// 😠 Expressions (10 options)
const EXPRESSIONS = [
  "angry scowling",
  "evil grinning",
  "grumpy frowning",
  "crazy laughing",
  "sneaky smirking",
  "confused stupid",
  "aggressive snarling",
  "greedy drooling",
  "surprised shocked",
  "proud confident"
];

function getRandomElement(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt() {
  const skinColor = getRandomElement(SKIN_COLORS);
  const headItem = getRandomElement(HEAD_ITEMS);
  const eyeItem = getRandomElement(EYE_ITEMS);
  const mouthItem = getRandomElement(MOUTH_ITEMS);
  const clothing = getRandomElement(CLOTHING);
  const neckItem = getRandomElement(NECK_ITEMS);
  const handItem = getRandomElement(HAND_ITEMS);
  const background = getRandomElement(BACKGROUNDS);
  const expression = getRandomElement(EXPRESSIONS);
  
  const prompt = [
    "simple flat 2D cartoon illustration, clean vector art style",
    `adorable cute ${BASE_CHARACTER} with ${skinColor} smooth skin`,
    // 🔥 NEW - FAT BODY DESCRIPTION!
    "extremely fat chubby body, round plump belly, thick chunky legs",
    "rotund obese proportions, pudgy overweight, wide stocky build",
    "big fat round torso, chubby thick arms, stubby short limbs",
    `${expression} expression, large pointed ears`,
    "small cute chubby creature, chibi blob proportions",
    `${headItem}`,
    `${eyeItem}`,
    `${mouthItem}`,
    `${clothing}`,
    `${neckItem}`,
    `${handItem}`,
    "facing directly forward toward camera, straight front view, symmetrical pose",
    "standing upright centered perfectly, full body visible",
    "looking straight ahead at viewer, direct eye contact forward",
    "feet planted on ground facing forward, not turned sideways",
    "thick black outlines, bold lines, simple coloring",
    "flat cartoon shading minimal, clean vector style",
    "children's book illustration aesthetic, storybook art",
    `${background} background flat color no details`,
    "simple cartoon character design, mascot style, clean flat art",
    "character portrait style, facing camera directly, front-facing pose"
  ].join(", ");

  const negative = [
    "3D render, CGI, realistic, photorealistic, detailed rendering",
    "complex shading, realistic lighting, dramatic shadows, atmospheric depth",
    "detailed texture, realistic skin, fur detail, hair strands visible",
    "cinematic lighting, studio lighting, professional photography",
    "painted style, brush strokes, oil painting, watercolor, matte painting",
    "blurry, low quality, messy, sketchy, unfinished",
    "text, watermark, logo, signature, frame, border",
    "multiple characters, cropped, background details, scenery",
    "realistic proportions, human-like, detailed anatomy",
    "gradient background, textured background, detailed environment",
    "side view, profile view, turned sideways, angled pose",
    "3/4 view, looking to the side, facing left, facing right",
    "back view, rear view, turned around, rotated",
    "diagonal angle, tilted, asymmetrical pose, off-center",
    // 🔥 NEW - BLOCK THIN BODIES!
    "thin, skinny, slim, slender, lean body",
    "muscular, athletic, fit, toned physique",
    "tall, lanky, long limbs, stretched proportions"
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
    console.log("🧌 Generating FAT CHUBBY GOBLIN...");
    
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
