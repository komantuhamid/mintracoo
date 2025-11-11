export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// 🧌 BASE CHARACTER
const BASE_CHARACTER = "cute round blob goblin creature monster";

// 🎨 COLOR SCHEMES (36 pairs)
const GOBLIN_COLOR_SCHEMES = [
  // 💚 GREEN (8)
  { skin: "bright neon lime green glowing", bg: "solid lime green bright" },
  { skin: "dark forest green deep", bg: "solid forest green dark" },
  { skin: "mint green pastel light", bg: "solid mint green pale" },
  { skin: "olive green earthy", bg: "solid olive green muted" },
  { skin: "emerald green rich vibrant", bg: "solid emerald green" },
  { skin: "sage green muted soft", bg: "solid sage green soft" },
  { skin: "chartreuse yellow-green bright", bg: "solid yellow-green" },
  { skin: "jade green medium", bg: "solid jade green" },
  
  // 💙 BLUE (6)
  { skin: "cobalt blue bright electric", bg: "solid bright blue" },
  { skin: "navy blue dark deep", bg: "solid dark navy blue" },
  { skin: "cyan blue light bright", bg: "solid cyan blue" },
  { skin: "teal turquoise blue-green", bg: "solid teal turquoise" },
  { skin: "sky blue pastel light", bg: "solid sky blue pale" },
  { skin: "royal blue rich vibrant", bg: "solid royal blue" },
  
  // 💜 PURPLE (5)
  { skin: "violet purple bright", bg: "solid violet purple" },
  { skin: "deep purple dark rich", bg: "solid deep purple" },
  { skin: "lavender purple pastel", bg: "solid lavender purple" },
  { skin: "magenta purple-pink bright", bg: "solid magenta pink" },
  { skin: "indigo purple-blue deep", bg: "solid indigo purple" },
  
  // ❤️ RED/ORANGE (5)
  { skin: "crimson red bright", bg: "solid crimson red" },
  { skin: "dark red maroon deep", bg: "solid maroon red" },
  { skin: "orange bright vibrant", bg: "solid bright orange" },
  { skin: "coral orange-pink", bg: "solid coral orange" },
  { skin: "rust orange-brown", bg: "solid rust orange" },
  
  // 🩶 GRAY/BLACK/WHITE (4)
  { skin: "charcoal gray dark", bg: "solid dark gray charcoal" },
  { skin: "slate gray medium", bg: "solid slate gray" },
  { skin: "bone white pale cream", bg: "solid cream beige pale" },
  { skin: "jet black dark", bg: "solid dark gray black" },
  
  // 💛 YELLOW/GOLD (3)
  { skin: "golden yellow bright", bg: "solid golden yellow" },
  { skin: "mustard yellow earthy", bg: "solid mustard yellow" },
  { skin: "lemon yellow pale", bg: "solid lemon yellow" },
  
  // 🤎 BROWN (3)
  { skin: "chocolate brown dark", bg: "solid dark brown" },
  { skin: "tan brown light", bg: "solid tan brown" },
  { skin: "mahogany red-brown deep", bg: "solid mahogany brown" },
  
  // 🩷 PINK (2)
  { skin: "hot pink bright vibrant", bg: "solid hot pink" },
  { skin: "rose pink soft", bg: "solid rose pink" }
];

// 👒 HEAD ITEMS (30 options!) - EXPANDED!
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
  "bald head no hat",
  // 🔥 NEW!
  "viking helmet with horns on head",
  "cowboy hat on top of head",
  "pirate tricorn hat on head",
  "chef hat tall white on head",
  "baseball cap worn backwards on head",
  "bucket hat on top of head",
  "beanie knit cap on head",
  "beret tilted on head",
  "sombrero on top of head",
  "top hat tall on head",
  "fedora hat on head",
  "samurai kabuto helmet on head",
  "ninja hood covering head",
  "santa hat red on head",
  "party hat cone on head"
];

// 👀 EYE ITEMS (25 options!) - EXPANDED!
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
  "squinting menacing eyes",
  // 🔥 NEW!
  "sunglasses cool over eyes",
  "3D glasses red-blue over eyes",
  "steampunk goggles brass over eyes",
  "cyclops single giant eye",
  "heart-shaped glasses over eyes",
  "ski goggles over eyes",
  "swimming goggles over eyes",
  "VR headset over eyes",
  "laser eyes glowing red",
  "star-shaped sunglasses over eyes",
  "cat-eye glasses over eyes",
  "jeweled monocle over one eye",
  "cracked monocle over eye",
  "glowing blue eyes bright",
  "X-ray specs over eyes"
];

// 👄 MOUTH ITEMS (15 options!) - NO CIGARS!
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
  "fierce grinning mouth with fangs",
  // 🔥 NEW!
  "vampire fangs protruding from mouth",
  "single gold tooth shining in grin",
  "missing front teeth gap in smile",
  "braces on teeth metal visible",
  "tongue sticking out cheeky"
];

// 👕 CLOTHING (35 options!) - MASSIVE EXPANSION!
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
  "bare chest showing chubby belly",
  // 🔥 NEW!
  "hawaiian shirt floral on body",
  "tuxedo jacket fancy on torso",
  "hoodie with hood down on body",
  "tank top sleeveless on torso",
  "sweater knitted on body",
  "denim jacket on torso",
  "bomber jacket on body",
  "tracksuit jacket on torso",
  "polo shirt collared on body",
  "football jersey on torso",
  "basketball jersey on body",
  "chef coat white on torso",
  "lab coat white on body",
  "ninja suit black on torso",
  "samurai armor on body",
  "superhero cape on shoulders",
  "wizard robe long on body",
  "monk robe brown on body",
  "kimono traditional on body",
  "poncho over shoulders"
];

// ⛓️ NECK ITEMS (30 options!) - MASSIVE EXPANSION!
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
  "bare neck no necklace",
  // 🔥 NEW!
  "thick gold chain heavy on neck",
  "diamond necklace sparkling on neck",
  "pearl necklace elegant around neck",
  "dog tag chain military on neck",
  "crucifix necklace on neck",
  "locket heart-shaped on neck",
  "crystal pendant glowing on neck",
  "amulet mystical on neck",
  "coin necklace pirate on neck",
  "feather necklace tribal on neck",
  "seashell necklace beach on neck",
  "dog collar spiked around neck",
  "bow tie around neck",
  "necktie striped around neck",
  "scarf wrapped around neck",
  "bandana around neck",
  "silver chain thin on neck",
  "rope necklace thick around neck",
  "gemstone necklace colorful on neck",
  "choker tight around neck"
];

// 🗡️ HAND ITEMS (40 options!) - MASSIVE EXPANSION!
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
  "both hands clenched in small fists",
  // 🔥 NEW!
  "holding smartphone in hand",
  "gripping game controller in hands",
  "holding coffee cup in hand",
  "gripping microphone in hand",
  "holding pizza slice in hand",
  "gripping magic wand in hand",
  "holding book open in hand",
  "gripping telescope in hand",
  "holding magnifying glass in hand",
  "gripping fishing rod in hand",
  "holding basketball in hands",
  "gripping baseball bat in hand",
  "holding trophy golden in hand",
  "gripping drumsticks in hands",
  "holding guitar small in hand",
  "gripping paintbrush in hand",
  "holding camera in hand",
  "gripping sword katana in hand",
  "holding gem crystal in hand",
  "gripping staff wooden in hand"
];

// 😠 EXPRESSIONS (15 options!) - EXPANDED!
const EXPRESSIONS = [
  "angry scowling",
  "evil grinning maniacally",
  "grumpy frowning",
  "crazy laughing wild",
  "sneaky smirking",
  "confused dumb",
  "aggressive menacing",
  "proud confident",
  // 🔥 NEW!
  "surprised shocked wide-eyed",
  "sleepy tired yawning",
  "excited happy beaming",
  "nervous sweating worried",
  "silly goofy derpy",
  "cool relaxed chill",
  "mischievous plotting devious"
];

// 🔧 Generic function
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt() {
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
    
    // 🎨 SAME-COLOR BACKGROUND
    `${background} background flat solid color no details`,
    "background same color family as character",
    "simple cartoon mascot, cute blob monster character"
  ].join(", ");

  const negative = [
    "3D render, CGI, realistic, photorealistic, detailed",
    "complex shading, dramatic lighting, shadows, depth",
    "detailed texture, fur strands, hair detail, realistic skin",
    "cinematic lighting, photography, studio lighting",
    "painted, brush strokes, oil painting, watercolor",
    "blurry, low quality, messy, sketchy, unfinished",
    "text, watermark, logo, signature, frame, border",
    "multiple characters, cropped, background scenery",
    "side view, profile, turned sideways, angled",
    "3/4 view, looking sideways, facing left or right",
    "back view, rear view, turned around, rotated",
    "muscular, athletic, fit, toned, abs visible",
    "muscle definition, biceps, six pack, defined",
    "tall, long limbs, stretched, slender, lanky",
    "thin, skinny, slim, lean, human proportions",
    "cigar, pipe, smoking, cigarette, tobacco",
    "cigar in mouth, pipe in mouth, smoking item",
    "holding cigar, holding pipe, smoke, smoking",
    "floating accessories, misplaced items",
    "hat floating, clothing on wrong body part",
    "accessories in wrong positions, jumbled traits",
    "items overlapping incorrectly",
    "gradient background, textured backdrop, complex scene",
    "background scenery, background objects, detailed background",
    "contrasting background, complementary colors"
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
    console.log("🎨 Generating PRO NFT GOBLIN...");
    
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
