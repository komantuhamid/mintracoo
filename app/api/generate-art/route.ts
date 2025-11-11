export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// 🧌 BASE CHARACTER - SOFT BLOB STYLE!
const BASE_CHARACTER = "cute round blob goblin creature monster";

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

// 👒 Head items (20 options) - SIMPLE ONLY!
const HEAD_ITEMS = [
  "wearing small leather cap",
  "wearing tiny metal helmet",
  "wearing cloth hood",
  "wearing small bandana",
  "wearing bone helmet",
  "wearing small iron crown",
  "wearing bucket hat",
  "wearing wizard hat",
  "wearing fur hat",
  "wearing wooden mask",
  "wearing mushroom cap",
  "wearing small horned helmet",
  "wearing goggles",
  "wearing skull cap",
  "wearing straw hat",
  "wearing jester hat",
  "wearing pointed hood",
  "wearing war paint",
  "wearing animal pelt",
  "bald round head"
];

// 👀 Eye items (12 options) - SIMPLE!
const EYE_ITEMS = [
  "wearing small eye patch",
  "wearing tiny goggles",
  "wearing small monocle",
  "wearing round glasses",
  "wearing small scrap goggles",
  "wearing bandage over one eye",
  "wearing face paint stripes",
  "wearing small mask",
  "wearing tiny aviator goggles",
  "wearing small blindfold",
  "large round yellow eyes",
  "small beady eyes"
];

// 👄 Mouth items (10 options) - SIMPLE!
const MOUTH_ITEMS = [
  "smoking tiny wooden pipe",
  "smoking small cigar",
  "chewing small bone",
  "holding tiny coin in mouth",
  "smoking small clay pipe",
  "huge wide grinning mouth showing sharp fangs",
  "giant open mouth with jagged teeth",
  "massive toothy grin menacing",
  "enormous mouth with rows of sharp fangs",
  "wide crazy smile showing all teeth"
];

// 👕 Clothing (20 options) - SIMPLE!
const CLOTHING = [
  "wearing small leather vest",
  "wearing tiny torn rags",
  "wearing simple cloth tunic",
  "wearing small fur vest",
  "wearing simple leather jerkin",
  "wearing tiny torn robes",
  "wearing simple burlap tunic",
  "wearing small patchwork leather",
  "wearing tiny animal hide",
  "wearing simple torn shirt",
  "wearing small iron armor",
  "wearing tiny torn cloak",
  "wearing simple leather coat",
  "wearing small pirate vest",
  "wearing simple prisoner rags",
  "wearing tiny leather apron",
  "wearing simple monk robes",
  "wearing small bandit leather",
  "wearing tiny sailor vest",
  "bare chest chubby belly"
];

// ⛓️ Neck items (10 options) - SIMPLE!
const NECK_ITEMS = [
  "wearing small bone necklace",
  "wearing tiny iron collar",
  "wearing small tooth necklace",
  "wearing simple leather cord",
  "wearing tiny gold chain",
  "wearing small bead necklace",
  "wearing simple rope",
  "wearing tiny medallion",
  "wearing small skull pendant",
  "bare neck"
];

// 🗡️ Hand items (20 options) - SIMPLE SMALL ITEMS!
const HAND_ITEMS = [
  "holding small rusty dagger",
  "holding tiny wooden club",
  "holding small coin bag",
  "holding tiny wooden shield",
  "holding small torch",
  "holding tiny battle axe",
  "holding small shortsword",
  "holding tiny iron mace",
  "holding small wooden spear",
  "holding tiny bow",
  "holding small loot sack",
  "holding tiny lantern",
  "holding small skull cup",
  "holding tiny potion vial",
  "holding small bomb",
  "holding tiny pickaxe",
  "holding small meat leg",
  "holding tiny mushroom",
  "holding small keys",
  "small clenched fists"
];

// 🎨 Background colors (10 options) - SOLID FLAT!
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

// 😠 Expressions (8 options)
const EXPRESSIONS = [
  "angry scowling mean",
  "evil grinning wicked",
  "grumpy frowning annoyed",
  "crazy laughing maniacal",
  "sneaky smirking mischievous",
  "confused dumb stupid",
  "aggressive menacing fierce",
  "proud confident smug"
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
    `adorable ${BASE_CHARACTER} with ${skinColor} smooth soft skin`,
    // 🔥 KEY FIX - SOFT BLOB BODY (NO MUSCLES!)
    "round soft blob body shape, smooth chubby belly no abs",
    "simple dumpy proportions, pudgy spherical torso",
    "tiny short stubby legs, small rounded arms no muscles",
    "no muscle definition, soft pillowy body, cuddly round shape",
    "wide short stature, squat compact build, roly-poly body",
    `${expression} facial expression, small pointed ears`,
    `${mouthItem}`,
    "cute small chubby creature, simple chibi blob design",
    `${headItem}`,
    `${eyeItem}`,
    `${clothing}`,
    `${neckItem}`,
    `${handItem}`,
    "facing directly forward toward camera, straight front view, symmetrical",
    "standing upright centered, full body visible front-facing",
    "looking straight ahead at viewer, direct forward pose",
    "feet planted on ground, short stubby legs visible",
    "thick black outlines, bold cartoon lines, simple flat coloring",
    "minimal soft shading, clean vector illustration style",
    "children's book art, storybook character design",
    `${background} background flat solid color no details`,
    "simple cartoon mascot style, cute blob monster design"
  ].join(", ");

  const negative = [
    "3D render, CGI, realistic, photorealistic, detailed rendering",
    "complex shading, realistic lighting, dramatic shadows, depth",
    "detailed texture, realistic skin, fur strands, hair detail",
    "cinematic lighting, professional photography, studio setup",
    "painted style, brush strokes, oil painting, watercolor, matte",
    "blurry, low quality, messy, sketchy, unfinished, draft",
    "text, watermark, logo, signature, caption, frame, border",
    "multiple characters, cropped body, background scenery, objects",
    "realistic proportions, human anatomy, detailed muscles",
    "gradient background, textured backdrop, complex environment",
    "side view, profile, turned sideways, angled pose, diagonal",
    "3/4 view, looking sideways, facing left, facing right",
    "back view, rear, turned around, rotated, off-center",
    // 🔥 KEY FIX - BLOCK ALL MUSCLES/DEFINITION!
    "muscular, athletic, fit, toned, ripped, abs visible",
    "muscle definition, biceps, six pack, defined muscles",
    "strong warrior, bodybuilder, athletic build, buff",
    "tall, long limbs, stretched proportions, slender",
    "thin, skinny, slim, lean body, lanky proportions"
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
    console.log("🧌 Generating SOFT BLOB GOBLIN...");
    
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
