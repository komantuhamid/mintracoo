export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// 🧌 BASE CHARACTER
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

// 👒 Head items (20 options)
const HEAD_ITEMS = [
  "small leather cap on top of head",
  "tiny metal helmet on top of head",
  "cloth hood covering head",
  "small bandana on head",
  "bone helmet on top of head",
  "small iron crown on top of head",
  "bucket hat on head",
  "wizard hat on top of head",
  "fur hat on head",
  "wooden mask on face",
  "mushroom cap on top of head",
  "small horned helmet on head",
  "goggles on forehead",
  "skull cap on top of head",
  "straw hat on head",
  "jester hat on top of head",
  "pointed hood covering head",
  "war paint on face",
  "animal pelt on head",
  "bald head no hat"
];

// 👀 Eye items (12 options)
const EYE_ITEMS = [
  "small eye patch over one eye",
  "tiny goggles over eyes",
  "small monocle over one eye",
  "round glasses over eyes",
  "small scrap goggles over eyes",
  "bandage covering one eye",
  "face paint stripes on face",
  "small mask covering upper face",
  "tiny aviator goggles over eyes",
  "small blindfold over eyes",
  "large round yellow eyes",
  "small beady eyes"
];

// 👄 Mouth items (15 options)
const MOUTH_ITEMS = [
  "small cigar clenched in corner of mouth",
  "wooden pipe held in mouth",
  "small cigar in side of mouth",
  "small clay pipe in corner of mouth",
  "cigar clenched between teeth in mouth",
  "huge wide grinning mouth showing sharp fangs",
  "giant open mouth with jagged fangs",
  "massive toothy grin showing fangs",
  "enormous mouth with rows of sharp fangs",
  "wide crazy smile showing sharp teeth",
  "evil grinning mouth with visible fangs",
  "creepy smile with sharp jagged teeth",
  "menacing grin with big fangs",
  "wicked smile showing rows of teeth",
  "fierce grinning mouth with fangs"
];

// 👕 Clothing (20 options)
const CLOTHING = [
  "small leather vest worn on torso",
  "tiny torn rags covering body",
  "simple cloth tunic on body",
  "small fur vest on torso",
  "simple leather jerkin on body",
  "tiny torn robes on body",
  "simple burlap tunic covering torso",
  "small patchwork leather on body",
  "tiny animal hide covering torso",
  "simple torn shirt on body",
  "small iron armor on torso",
  "tiny torn cloak over shoulders",
  "simple leather coat on body",
  "small pirate vest on torso",
  "simple prisoner rags on body",
  "tiny leather apron on torso",
  "simple monk robes on body",
  "small bandit leather on torso",
  "tiny sailor vest on body",
  "bare chest showing chubby belly"
];

// ⛓️ Neck items (10 options)
const NECK_ITEMS = [
  "small bone necklace around neck",
  "tiny iron collar around neck",
  "small tooth necklace on neck",
  "simple leather cord around neck",
  "tiny gold chain on neck",
  "small bead necklace around neck",
  "simple rope around neck",
  "tiny medallion hanging on neck",
  "small skull pendant on neck",
  "bare neck no necklace"
];

// 🗡️ Hand items (25 options)
const HAND_ITEMS = [
  "holding small rusty dagger in hand",
  "gripping tiny wooden club in hand",
  "holding small coin bag in hand",
  "holding tiny wooden shield in hand",
  "holding small torch in hand",
  "gripping tiny battle axe in hand",
  "holding small shortsword in hand",
  "gripping tiny iron mace in hand",
  "holding small wooden spear in hand",
  "holding tiny bow in hand",
  "holding small loot sack in hand",
  "holding tiny lantern in hand",
  "holding small skull cup in hand",
  "holding tiny potion vial in hand",
  "holding small bomb in hand",
  "gripping tiny pickaxe in hand",
  "holding small meat leg in hand",
  "holding tiny mushroom in hand",
  "holding small keys in hand",
  "holding small bottle in hand",
  "holding tiny map scroll in hand",
  "holding small crossbow in hand",
  "gripping tiny hammer in hand",
  "holding small treasure chest in hands",
  "both hands clenched in small fists"
];

// 🎨 Background colors (10 options)
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
  "angry scowling",
  "evil grinning",
  "grumpy frowning",
  "crazy laughing",
  "sneaky smirking",
  "confused stupid",
  "aggressive menacing",
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
    // 🎨 STYLE
    "simple flat 2D cartoon illustration, clean vector art style",
    "thick black outlines, bold cartoon lines, simple flat coloring",
    "minimal soft shading, clean vector illustration style",
    "children's book art, storybook character design",
    
    // 🧌 BODY
    `adorable ${BASE_CHARACTER} with ${skinColor} smooth soft skin`,
    "round soft blob body shape, smooth chubby belly no abs",
    "simple dumpy proportions, pudgy spherical torso",
    "tiny short stubby legs, small rounded arms no muscles",
    "no muscle definition, soft pillowy body, cuddly round shape",
    "wide short stature, squat compact build, roly-poly body",
    
    // 😠 FACE & EXPRESSION
    `${expression} facial expression`,
    "small pointed ears on sides of head",
    
    // 👒 HEAD TRAIT (on top of head)
    `${headItem}`,
    
    // 👀 EYE TRAIT (on face over eyes)
    `${eyeItem}`,
    
    // 👄 MOUTH TRAIT (in mouth on face)
    `${mouthItem}`,
    
    // 👕 CLOTHING TRAIT (on body/torso)
    `${clothing}`,
    
    // ⛓️ NECK TRAIT (around neck)
    `${neckItem}`,
    
    // 🗡️ HAND TRAIT (in hands)
    `${handItem}`,
    
    // 🔥 STRICT POSITIONING RULES
    "each item in its correct anatomical position",
    "hat on head not floating, eyes on face, mouth on face",
    "clothing on body only, necklace on neck only, weapon in hands only",
    "all accessories properly positioned on correct body parts",
    
    // 📐 POSE & DIRECTION
    "facing directly forward toward camera, straight front view, symmetrical",
    "standing upright centered, full body visible front-facing",
    "looking straight ahead at viewer, direct forward pose",
    "feet planted on ground, short stubby legs visible",
    
    // 🎨 BACKGROUND
    `${background} background flat solid color no details`,
    "simple cartoon mascot style, cute blob monster design"
  ].join(", ");

  const negative = [
    // ❌ STYLE BLOCKS
    "3D render, CGI, realistic, photorealistic, detailed rendering",
    "complex shading, realistic lighting, dramatic shadows, depth",
    "detailed texture, realistic skin, fur strands, hair detail",
    "cinematic lighting, professional photography, studio setup",
    "painted style, brush strokes, oil painting, watercolor, matte",
    "blurry, low quality, messy, sketchy, unfinished, draft",
    "text, watermark, logo, signature, caption, frame, border",
    
    // ❌ COMPOSITION BLOCKS
    "multiple characters, cropped body, background scenery, objects",
    "side view, profile, turned sideways, angled pose, diagonal",
    "3/4 view, looking sideways, facing left, facing right",
    "back view, rear, turned around, rotated, off-center",
    
    // ❌ BODY BLOCKS
    "muscular, athletic, fit, toned, ripped, abs visible",
    "muscle definition, biceps, six pack, defined muscles",
    "strong warrior, bodybuilder, athletic build, buff",
    "tall, long limbs, stretched proportions, slender",
    "thin, skinny, slim, lean body, lanky proportions",
    "realistic proportions, human anatomy, detailed muscles",
    
    // ❌ BACKGROUND BLOCKS
    "gradient background, textured backdrop, complex environment",
    
    // 🔥 CRITICAL - WRONG POSITIONING BLOCKS
    "hat floating in air not on head",
    "clothing on head, hat on body, wrong placement",
    "eyes floating away from face, misplaced eyes",
    "mouth not on face, mouth floating away",
    "necklace on head, necklace on hands, wrong position",
    "weapon floating in air not in hands",
    "accessories in wrong positions, misplaced items",
    "traits overlapping incorrectly, jumbled accessories",
    "cigar floating away from mouth disconnected",
    "hat covering eyes completely, accessories blocking face",
    "items in anatomically incorrect positions"
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
    console.log("🧌 Generating PROPERLY-POSITIONED GOBLIN...");
    
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
            guidance_scale: 8.0,  // ← Increased for BETTER control!
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
