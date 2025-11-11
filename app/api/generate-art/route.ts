export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// 🧌 BASE CHARACTER
const BASE_CHARACTER = "cute round blob goblin creature monster";

// 🎨 MEGA SKIN COLORS (30+ options!) - MAXIMUM VARIETY!
const SKIN_COLORS = [
  // 💚 GREEN FAMILY (8 shades)
  "bright neon lime green glowing",
  "dark forest green deep",
  "mint green pastel light",
  "olive green earthy",
  "emerald green rich vibrant",
  "sage green muted soft",
  "chartreuse yellow-green bright",
  "jade green medium",
  
  // 💙 BLUE FAMILY (6 shades)
  "cobalt blue bright electric",
  "navy blue dark deep",
  "cyan blue light bright",
  "teal turquoise blue-green",
  "sky blue pastel light",
  "royal blue rich vibrant",
  
  // 💜 PURPLE FAMILY (5 shades)
  "violet purple bright",
  "deep purple dark rich",
  "lavender purple pastel",
  "magenta purple-pink bright",
  "indigo purple-blue deep",
  
  // ❤️ RED/ORANGE FAMILY (5 shades)
  "crimson red bright",
  "dark red maroon deep",
  "orange bright vibrant",
  "coral orange-pink",
  "rust orange-brown",
  
  // 🩶 GRAY/BLACK/WHITE FAMILY (4 shades)
  "charcoal gray dark",
  "slate gray medium",
  "bone white pale cream",
  "jet black dark",
  
  // 💛 YELLOW/GOLD FAMILY (3 shades)
  "golden yellow bright",
  "mustard yellow earthy",
  "lemon yellow pale",
  
  // 🤎 BROWN FAMILY (3 shades)
  "chocolate brown dark",
  "tan brown light",
  "mahogany red-brown deep",
  
  // 🩷 PINK FAMILY (2 shades)
  "hot pink bright vibrant",
  "rose pink soft"
];

// 👒 Head items (15 options)
const HEAD_ITEMS = [
  "small leather cap on top of head",
  "tiny metal helmet on top of head",
  "cloth hood covering head",
  "small bandana on head",
  "bone helmet on top of head",
  "small iron crown on top of head",
  "wizard hat on top of head",
  "fur hat on head",
  "small horned helmet on head",
  "skull cap on top of head",
  "straw hat on head",
  "pointed hood covering head",
  "war paint marks on face",
  "animal pelt on head",
  "bald head no hat"
];

// 👀 Eye items (10 options)
const EYE_ITEMS = [
  "small eye patch over one eye",
  "tiny goggles over eyes",
  "small monocle over one eye",
  "round glasses over eyes",
  "bandage covering one eye",
  "tiny aviator goggles over eyes",
  "large round yellow eyes",
  "small beady eyes glowing",
  "wide crazy eyes bulging",
  "squinting menacing eyes"
];

// 👄 Mouth items (10 options) - NO CIGARS!
const MOUTH_ITEMS = [
  "huge wide grinning mouth showing many sharp fangs",
  "giant open mouth with rows of jagged fangs",
  "massive toothy grin showing pointed fangs",
  "enormous mouth with multiple rows of sharp fangs",
  "wide crazy smile showing all sharp teeth",
  "evil grinning mouth with prominent fangs visible",
  "creepy smile with sharp jagged teeth",
  "menacing grin with big fangs",
  "wicked smile showing rows of teeth",
  "fierce grinning mouth with fangs"
];

// 👕 Clothing (15 options)
const CLOTHING = [
  "small leather vest worn on torso",
  "tiny torn rags covering body",
  "simple cloth tunic on body",
  "small fur vest on torso",
  "simple leather jerkin on body",
  "tiny torn robes on body",
  "small patchwork leather on body",
  "tiny animal hide covering torso",
  "simple torn shirt on body",
  "small iron armor on torso",
  "tiny torn cloak over shoulders",
  "simple leather coat on body",
  "small pirate vest on torso",
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
  "tiny medallion hanging on neck",
  "small skull pendant on neck",
  "simple rope around neck",
  "bare neck no necklace"
];

// 🗡️ Hand items (20 options)
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
  "gripping tiny pickaxe in hand",
  "holding small meat leg in hand",
  "holding small keys in hand",
  "holding small bottle in hand",
  "gripping tiny hammer in hand",
  "both hands clenched in small fists"
];

// 🎨 Background colors (10 options)
const BACKGROUNDS = [
  "solid bright green",
  "solid dark teal",
  "solid warm brown",
  "solid cool gray",
  "solid deep navy blue",
  "solid rich purple",
  "solid bright orange",
  "solid crimson red",
  "solid sky blue",
  "solid olive green"
];

// 😠 Expressions (8 options)
const EXPRESSIONS = [
  "angry scowling",
  "evil grinning maniacally",
  "grumpy frowning",
  "crazy laughing wild",
  "sneaky smirking",
  "confused dumb",
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
    "thick black outlines, bold cartoon lines, simple coloring",
    "soft minimal shading, smooth vector illustration",
    "children's book art style, cute storybook character",
    
    // 🧌 BODY
    `adorable ${BASE_CHARACTER} with ${skinColor} smooth skin`,
    "round soft blob body, smooth chubby round belly",
    "simple cute dumpy proportions, pudgy spherical torso",
    "tiny short stubby legs, small rounded arms",
    "no muscle definition, soft pillowy cuddly body",
    "wide short squat stature, roly-poly blob build",
    
    // 😠 FACE & EXPRESSION
    `${expression} facial expression`,
    "small pointed ears on sides of head",
    
    // 🔥 TRAITS IN CORRECT POSITIONS
    `${headItem}`,
    `${eyeItem}`,
    `${mouthItem}`,
    "mouth showing fangs teeth clearly visible",
    `${clothing}`,
    `${neckItem}`,
    `${handItem}`,
    
    // 🎯 POSITIONING RULES
    "all accessories in correct anatomical positions",
    "hat on head, eyes on face, mouth on face visible",
    "clothing on body, necklace on neck, weapon in hands",
    
    // 📐 POSE
    "facing directly forward straight ahead toward camera",
    "front view centered symmetrical pose",
    "standing upright full body visible",
    "looking straight at viewer, feet on ground",
    "stubby legs visible, centered composition",
    
    // 🎨 BACKGROUND
    `${background} background solid flat color no details`,
    "simple cartoon mascot, cute blob monster character"
  ].join(", ");

  const negative = [
    // ❌ STYLE BLOCKS
    "3D render, CGI, realistic, photorealistic, detailed",
    "complex shading, dramatic lighting, shadows, depth",
    "detailed texture, fur strands, hair detail, realistic skin",
    "cinematic lighting, photography, studio lighting",
    "painted, brush strokes, oil painting, watercolor",
    "blurry, low quality, messy, sketchy, unfinished",
    "text, watermark, logo, signature, frame, border",
    
    // ❌ COMPOSITION BLOCKS
    "multiple characters, cropped, background scenery",
    "side view, profile, turned sideways, angled",
    "3/4 view, looking sideways, facing left or right",
    "back view, rear view, turned around, rotated",
    
    // ❌ BODY BLOCKS
    "muscular, athletic, fit, toned, abs visible",
    "muscle definition, biceps, six pack, defined",
    "tall, long limbs, stretched, slender, lanky",
    "thin, skinny, slim, lean, human proportions",
    
    // 🔥 NO SMOKING!
    "cigar, pipe, smoking, cigarette, tobacco",
    "cigar in mouth, pipe in mouth, smoking item",
    "holding cigar, holding pipe, smoke, smoking",
    
    // 🔥 WRONG POSITIONING
    "floating accessories, misplaced items",
    "hat floating, clothing on wrong body part",
    "accessories in wrong positions, jumbled traits",
    "items overlapping incorrectly",
    
    // ❌ BACKGROUND BLOCKS
    "gradient background, textured backdrop, complex scene"
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
    console.log("🧌 Generating MEGA-COLOR GOBLIN...");
    
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
