export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// 🧌 BASE CHARACTER
const BASE_CHARACTER = "cute round blob goblin creature monster";

// 🎨 SKIN COLORS WITH MATCHING BACKGROUNDS!
const GOBLIN_COLOR_SCHEMES = [
  // 💚 GREEN GOBLINS → Warm backgrounds
  { skin: "bright neon lime green glowing", bg: "solid warm orange brown" },
  { skin: "dark forest green deep", bg: "solid rich burgundy red" },
  { skin: "mint green pastel light", bg: "solid soft coral pink" },
  { skin: "olive green earthy", bg: "solid warm terracotta orange" },
  { skin: "emerald green rich vibrant", bg: "solid deep maroon red" },
  { skin: "sage green muted soft", bg: "solid dusty rose pink" },
  { skin: "chartreuse yellow-green bright", bg: "solid deep purple" },
  { skin: "jade green medium", bg: "solid warm rust orange" },
  
  // 💙 BLUE GOBLINS → Orange/warm backgrounds
  { skin: "cobalt blue bright electric", bg: "solid bright orange" },
  { skin: "navy blue dark deep", bg: "solid golden yellow" },
  { skin: "cyan blue light bright", bg: "solid warm coral orange" },
  { skin: "teal turquoise blue-green", bg: "solid deep rust red" },
  { skin: "sky blue pastel light", bg: "solid soft peach orange" },
  { skin: "royal blue rich vibrant", bg: "solid amber orange" },
  
  // 💜 PURPLE GOBLINS → Yellow/green backgrounds
  { skin: "violet purple bright", bg: "solid golden yellow" },
  { skin: "deep purple dark rich", bg: "solid lime green" },
  { skin: "lavender purple pastel", bg: "solid soft yellow" },
  { skin: "magenta purple-pink bright", bg: "solid chartreuse green" },
  { skin: "indigo purple-blue deep", bg: "solid warm gold" },
  
  // ❤️ RED/ORANGE GOBLINS → Teal/blue-green backgrounds
  { skin: "crimson red bright", bg: "solid deep teal" },
  { skin: "dark red maroon deep", bg: "solid cyan blue-green" },
  { skin: "orange bright vibrant", bg: "solid dark teal blue" },
  { skin: "coral orange-pink", bg: "solid turquoise teal" },
  { skin: "rust orange-brown", bg: "solid deep sea teal" },
  
  // 🩶 GRAY/BLACK/WHITE GOBLINS → Vibrant backgrounds
  { skin: "charcoal gray dark", bg: "solid bright cyan blue" },
  { skin: "slate gray medium", bg: "solid vibrant purple" },
  { skin: "bone white pale cream", bg: "solid deep navy blue" },
  { skin: "jet black dark", bg: "solid electric orange" },
  
  // 💛 YELLOW/GOLD GOBLINS → Purple/blue backgrounds
  { skin: "golden yellow bright", bg: "solid deep purple" },
  { skin: "mustard yellow earthy", bg: "solid royal blue" },
  { skin: "lemon yellow pale", bg: "solid soft lavender" },
  
  // 🤎 BROWN GOBLINS → Blue/teal backgrounds
  { skin: "chocolate brown dark", bg: "solid bright cyan" },
  { skin: "tan brown light", bg: "solid deep teal" },
  { skin: "mahogany red-brown deep", bg: "solid turquoise blue" },
  
  // 🩷 PINK GOBLINS → Green backgrounds
  { skin: "hot pink bright vibrant", bg: "solid emerald green" },
  { skin: "rose pink soft", bg: "solid sage green" }
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
  // 🎨 Pick color scheme (skin + matching background!)
  const colorScheme = getRandomElement(GOBLIN_COLOR_SCHEMES);
  const skinColor = colorScheme.skin;
  const background = colorScheme.bg;
  
  const headItem = getRandomElement(HEAD_ITEMS);
  const eyeItem = getRandomElement(EYE_ITEMS);
  const mouthItem = getRandomElement(MOUTH_ITEMS);
  const clothing = getRandomElement(CLOTHING);
  const neckItem = getRandomElement(NECK_ITEMS);
  const handItem = getRandomElement(HAND_ITEMS);
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
    
    // 🎨 COLOR-MATCHED BACKGROUND!
    `${background} background flat solid color no details`,
    "background color complements character perfectly",
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
    "gradient background, textured backdrop, complex scene",
    "background scenery, background objects, detailed background"
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
    console.log("🎨 Generating COLOR-MATCHED GOBLIN...");
    
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
