export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-schnell"; // 🔥 FASTER MODEL!
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// 🎨 SINGLE FIXED TEMPLATE CHARACTER (NO VARIATION!)
const TEMPLATE_BASE = "chibi style cute round blob goblin mascot character";

// 🎨 72 COLOR SCHEMES (unchanged)
const GOBLIN_COLOR_SCHEMES = [
  { skin: "bright neon lime green", bg: "bright neon lime green" },
  { skin: "dark forest green", bg: "dark forest green" },
  { skin: "mint green pastel", bg: "mint green pastel" },
  { skin: "olive green earthy", bg: "olive green earthy" },
  { skin: "emerald green vibrant", bg: "emerald green vibrant" },
  { skin: "sage green soft", bg: "sage green soft" },
  { skin: "chartreuse yellow-green", bg: "chartreuse yellow-green" },
  { skin: "jade green medium", bg: "jade green medium" },
  { skin: "cobalt blue electric", bg: "cobalt blue electric" },
  { skin: "navy blue deep", bg: "navy blue deep" },
  { skin: "cyan blue bright", bg: "cyan blue bright" },
  { skin: "teal turquoise", bg: "teal turquoise" },
  { skin: "sky blue pastel", bg: "sky blue pastel" },
  { skin: "royal blue vibrant", bg: "royal blue vibrant" },
  { skin: "violet purple", bg: "violet purple" },
  { skin: "deep purple rich", bg: "deep purple rich" },
  { skin: "lavender purple", bg: "lavender purple" },
  { skin: "magenta purple-pink", bg: "magenta purple-pink" },
  { skin: "indigo purple-blue", bg: "indigo purple-blue" },
  { skin: "crimson red", bg: "crimson red" },
  { skin: "dark red maroon", bg: "dark red maroon" },
  { skin: "orange vibrant", bg: "orange vibrant" },
  { skin: "coral orange-pink", bg: "coral orange-pink" },
  { skin: "rust orange-brown", bg: "rust orange-brown" },
  { skin: "charcoal gray", bg: "charcoal gray" },
  { skin: "slate gray", bg: "slate gray" },
  { skin: "bone white cream", bg: "bone white cream" },
  { skin: "jet black", bg: "jet black" },
  { skin: "golden yellow", bg: "golden yellow" },
  { skin: "mustard yellow", bg: "mustard yellow" },
  { skin: "lemon yellow", bg: "lemon yellow" },
  { skin: "chocolate brown", bg: "chocolate brown" },
  { skin: "tan brown light", bg: "tan brown light" },
  { skin: "mahogany red-brown", bg: "mahogany red-brown" },
  { skin: "hot pink vibrant", bg: "hot pink vibrant" },
  { skin: "rose pink soft", bg: "rose pink soft" },
  { skin: "pastel pink baby", bg: "pastel pink baby" },
  { skin: "pastel blue powder", bg: "pastel blue powder" },
  { skin: "pastel mint green", bg: "pastel mint green" },
  { skin: "pastel lavender", bg: "pastel lavender" },
  { skin: "pastel peach orange", bg: "pastel peach orange" },
  { skin: "pastel lemon yellow", bg: "pastel lemon yellow" },
  { skin: "pastel lilac purple", bg: "pastel lilac purple" },
  { skin: "pastel aqua blue-green", bg: "pastel aqua blue-green" },
  { skin: "pastel coral pink-orange", bg: "pastel coral pink-orange" },
  { skin: "pastel sage green", bg: "pastel sage green" },
  { skin: "pastel periwinkle", bg: "pastel periwinkle" },
  { skin: "pastel ivory cream", bg: "pastel ivory cream" },
  { skin: "neon pink electric", bg: "neon pink electric" },
  { skin: "neon green lime", bg: "neon green lime" },
  { skin: "neon blue cyan", bg: "neon blue cyan" },
  { skin: "neon yellow electric", bg: "neon yellow electric" },
  { skin: "neon orange electric", bg: "neon orange electric" },
  { skin: "neon purple electric", bg: "neon purple electric" },
  { skin: "neon magenta electric", bg: "neon magenta electric" },
  { skin: "neon turquoise electric", bg: "neon turquoise electric" },
  { skin: "neon red electric", bg: "neon red electric" },
  { skin: "neon chartreuse", bg: "neon chartreuse" },
  { skin: "neon fuchsia pink-purple", bg: "neon fuchsia pink-purple" },
  { skin: "neon aqua blue-green", bg: "neon aqua blue-green" },
  { skin: "metallic gold shiny", bg: "metallic gold shiny" },
  { skin: "metallic silver shiny", bg: "metallic silver shiny" },
  { skin: "metallic bronze copper", bg: "metallic bronze copper" },
  { skin: "metallic rose gold", bg: "metallic rose gold" },
  { skin: "metallic platinum", bg: "metallic platinum" },
  { skin: "metallic copper orange", bg: "metallic copper orange" },
  { skin: "metallic chrome silver", bg: "metallic chrome silver" },
  { skin: "metallic brass yellow", bg: "metallic brass yellow" },
  { skin: "metallic titanium gray", bg: "metallic titanium gray" },
  { skin: "metallic pearl white", bg: "metallic pearl white" },
  { skin: "metallic gunmetal gray", bg: "metallic gunmetal gray" },
  { skin: "metallic champagne gold-beige", bg: "metallic champagne gold-beige" }
];

const HEAD_ITEMS = [
  "leather cap", "metal helmet", "cloth hood", "bandana",
  "bone helmet", "iron crown", "wizard hat", "fur hat",
  "horned helmet", "skull cap", "straw hat", "pointed hood",
  "war paint", "animal pelt", "bald head", "viking helmet",
  "cowboy hat", "pirate hat", "chef hat", "baseball cap",
  "bucket hat", "beanie", "beret", "sombrero",
  "top hat", "fedora", "samurai helmet", "ninja hood",
  "santa hat", "party hat"
];

const EYE_ITEMS = [
  "eye patch", "goggles", "monocle", "round glasses",
  "bandage eye", "aviator goggles", "yellow eyes", "beady eyes",
  "crazy eyes", "squinting eyes", "sunglasses", "retro glasses",
  "steampunk goggles", "cyclops eye", "heart glasses", "ski goggles",
  "swim goggles", "VR headset", "laser eyes", "star glasses",
  "cat-eye glasses", "jeweled monocle", "cracked monocle", "glowing eyes",
  "X-ray specs"
];

const MOUTH_ITEMS = [
  "wide grin fangs", "giant fangs", "toothy grin",
  "mouth fangs rows", "crazy smile sharp teeth", "evil grin fangs",
  "creepy smile teeth", "menacing grin", "wicked smile",
  "fierce grin fangs", "vampire fangs", "gold tooth",
  "gap teeth", "braces teeth", "tongue out"
];

const CLOTHING = [
  "leather vest", "torn rags", "cloth tunic", "fur vest",
  "leather jerkin", "torn robes", "patchwork leather", "animal hide",
  "torn shirt", "iron armor", "torn cloak", "leather coat",
  "pirate vest", "sailor vest", "bare chest", "hawaiian shirt",
  "tuxedo jacket", "hoodie", "tank top", "sweater",
  "denim jacket", "bomber jacket", "tracksuit", "polo shirt",
  "football jersey", "basketball jersey", "chef coat", "lab coat",
  "ninja suit", "samurai armor", "superhero cape", "wizard robe",
  "monk robe", "kimono", "poncho"
];

const NECK_ITEMS = [
  "bone necklace", "iron collar", "tooth necklace", "leather cord",
  "gold chain", "bead necklace", "medallion", "skull pendant",
  "rope", "no necklace", "thick gold chain", "diamond necklace",
  "pearl necklace", "dog tag", "crucifix", "locket",
  "crystal pendant", "amulet", "coin necklace", "feather necklace",
  "seashell necklace", "dog collar", "bow tie", "necktie",
  "scarf", "bandana neck", "silver chain", "rope necklace",
  "gemstone necklace", "choker"
];

const HAND_ITEMS = [
  "rusty dagger", "wooden club", "coin bag", "wooden shield",
  "torch", "battle axe", "shortsword", "iron mace",
  "wooden spear", "bow", "loot sack", "lantern",
  "skull cup", "potion vial", "pickaxe", "meat leg",
  "keys", "bottle", "hammer", "clenched fists",
  "smartphone", "game controller", "coffee cup", "microphone",
  "pizza slice", "magic wand", "book", "telescope",
  "magnifying glass", "fishing rod", "basketball", "baseball bat",
  "trophy", "drumsticks", "guitar", "paintbrush",
  "camera", "katana sword", "gem crystal", "wooden staff"
];

const EXPRESSIONS = [
  "angry scowl", "evil grin", "grumpy frown", "crazy laugh",
  "sneaky smirk", "confused", "aggressive", "proud",
  "surprised", "sleepy", "excited", "nervous",
  "silly goofy", "cool chill", "mischievous"
];

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
  
  // 🔥🔥🔥 ULTRA-STRICT TEMPLATE PROMPT!
  const prompt = `
EXACT TEMPLATE MATCH REQUIRED:
${TEMPLATE_BASE}, ${skinColor} skin color,
thick black cartoon outlines 4px width,
flat 2D vector art illustration style,
solid colors no gradients zero shading,
perfectly round circular blob body shape 1:1 ratio,
chubby round belly centered circle,
short stubby legs uniform length,
small rounded arms identical size,
${expression} expression,
wearing ${headItem} on head,
${eyeItem} on face,
${mouthItem} mouth showing,
wearing ${clothing} outfit,
${neckItem} around neck,
holding ${handItem} in hand,
front facing centered pose fixed camera angle,
floating in void no ground no floor no shadow,
flat ${background} background solid color uniform,
character and background same color ${skinColor},
chibi proportions kawaii style cute,
sticker design emoji style simple mascot,
COPY EXACT SAME STYLE EVERY TIME
`.trim().replace(/\n/g, ", ");

  const negative = `
realistic, photorealistic, 3d render, cgi, unreal engine,
shadows, shading, gradients, lighting effects, highlights,
depth, dimension, volume, perspective, foreshortening,
ground, floor, surface, standing on ground,
different body sizes, varying proportions, tall, short,
muscular, slim, athletic, inconsistent shapes,
detailed texture, complex details, fur strands, skin texture,
painted, painting, oil painting, watercolor, airbrush,
blurry, low quality, distorted, deformed, ugly,
multiple characters, cropped, cut off, partial body,
side view, profile, angled, back view, turned,
different art styles, style variation, inconsistent style,
text, watermark, signature, logo
`.trim().replace(/\n/g, ", ");

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
    console.log("🎨 Generating TEMPLATE-LOCKED NFT...");
    
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
            num_inference_steps: 25,      // 🔥 FASTER + MORE CONSISTENT
            guidance_scale: 12.0,         // 🔥 MAXIMUM CONTROL!
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
