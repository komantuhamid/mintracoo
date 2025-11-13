export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

// 🎨 50 COLOR SCHEMES
const GOBLIN_COLOR_SCHEMES = [
  { skin: "bright lime green", bg: "soft cream" },
  { skin: "dark forest green", bg: "light gray" },
  { skin: "mint green pastel", bg: "pale blue" },
  { skin: "olive green", bg: "warm tan" },
  { skin: "emerald green", bg: "soft white" },
  { skin: "sage green", bg: "light lavender" },
  { skin: "chartreuse yellow-green", bg: "pale pink" },
  { skin: "jade green", bg: "soft peach" },
  { skin: "cobalt blue", bg: "soft cream" },
  { skin: "navy blue", bg: "light gray" },
  { skin: "cyan blue", bg: "warm beige" },
  { skin: "teal turquoise", bg: "soft yellow" },
  { skin: "sky blue", bg: "soft gray" },
  { skin: "royal blue", bg: "light cream" },
  { skin: "violet purple", bg: "soft beige" },
  { skin: "deep purple", bg: "pale gray" },
  { skin: "lavender purple", bg: "soft white" },
  { skin: "magenta purple-pink", bg: "light tan" },
  { skin: "indigo purple-blue", bg: "soft cream" },
  { skin: "crimson red", bg: "soft gray" },
  { skin: "dark red maroon", bg: "warm beige" },
  { skin: "orange bright", bg: "soft cream" },
  { skin: "coral orange-pink", bg: "light blue" },
  { skin: "rust orange-brown", bg: "soft gray" },
  { skin: "charcoal gray", bg: "soft cream" },
  { skin: "slate gray", bg: "pale yellow" },
  { skin: "bone white", bg: "soft gray" },
  { skin: "jet black", bg: "soft white" },
  { skin: "golden yellow", bg: "soft gray" },
  { skin: "mustard yellow", bg: "warm beige" },
  { skin: "lemon yellow", bg: "soft white" },
  { skin: "chocolate brown", bg: "light tan" },
  { skin: "tan brown", bg: "soft gray" },
  { skin: "mahogany red-brown", bg: "soft cream" },
  { skin: "hot pink", bg: "light gray" },
  { skin: "rose pink", bg: "soft beige" },
  { skin: "pastel pink", bg: "soft white" },
  { skin: "pastel blue", bg: "soft cream" },
  { skin: "pastel mint", bg: "light tan" },
  { skin: "pastel lavender", bg: "soft gray" },
  { skin: "neon pink glowing", bg: "dark charcoal" },
  { skin: "neon green glowing", bg: "dark navy" },
  { skin: "neon blue glowing", bg: "dark purple" },
  { skin: "neon yellow glowing", bg: "dark gray" },
  { skin: "neon orange glowing", bg: "dark brown" },
  { skin: "metallic gold shiny", bg: "dark burgundy" },
  { skin: "metallic silver shiny", bg: "dark navy" },
  { skin: "metallic bronze", bg: "dark green" },
  { skin: "metallic rose gold", bg: "dark charcoal" },
  { skin: "metallic platinum", bg: "dark purple" }
];

// 🎩 40 HEAD ITEMS - Simplified descriptions
const HEAD_ITEMS = [
  "wizard hat", "party hat", "crown", "baseball cap", "beanie",
  "viking helmet with horns", "cowboy hat", "chef hat", 
  "santa hat", "bucket hat", "fedora", "top hat",
  "pirate hat", "samurai helmet", "ninja hood",
  "beret", "sombrero", "headband", "bandana",
  "mohawk hair", "backwards cap", "flower crown", 
  "tiara", "military helmet", "astronaut helmet", 
  "construction hard hat", "witch hat", "jester hat",
  "laurel wreath", "halo", "devil horns",
  "cat ears", "bunny ears", "bear ears",
  "propeller beanie", "graduation cap", "turban",
  "bowler hat", "safari hat", "bald head"
];

// 👁️ 35 EYE ITEMS
const EYE_ITEMS = [
  "big round eyes", "sunglasses", "goggles",
  "eye patch", "monocle", "3D glasses",
  "heart-shaped glasses", "star sunglasses", "nerd glasses",
  "ski goggles", "steampunk goggles", "VR headset",
  "cat-eye glasses", "round glasses", "reading glasses",
  "glowing red eyes", "glowing blue eyes", "glowing green eyes",
  "spiral eyes", "X eyes", "dollar sign eyes",
  "heart eyes", "star eyes", "angry eyes",
  "sleepy eyes", "crazy wide eyes", "cyclops eye",
  "snake eyes", "robot eyes", "blindfold",
  "winking", "squinting eyes", "happy eyes",
  "sad eyes", "surprised eyes"
];

// 😁 30 MOUTH ITEMS
const MOUTH_ITEMS = [
  "big toothy grin with fangs", "vampire fangs",
  "cute smile with small fangs", "tongue out",
  "gold tooth", "braces", "gap tooth",
  "missing tooth", "buck teeth", "fanged smile",
  "drooling", "lollipop in mouth", "bubble gum",
  "grillz teeth", "big laugh", "closed smile",
  "smirk", "frown", "pout",
  "surprised open mouth", "yawn", "evil grin",
  "menacing smile", "wicked grin", "happy smile",
  "sad frown", "neutral mouth", "singing mouth",
  "whistle lips", "kiss lips"
];

// 👔 50 CLOTHING
const CLOTHING = [
  "hoodie", "t-shirt", "tank top", "leather jacket",
  "bomber jacket", "denim jacket", "vest", "cardigan",
  "sweater", "turtleneck", "polo shirt", "button-up shirt",
  "flannel shirt", "hawaiian shirt", "tie-dye shirt",
  "band t-shirt", "sports jersey", "football jersey",
  "basketball jersey", "tracksuit", "windbreaker",
  "suit jacket", "tuxedo", "blazer", "lab coat",
  "chef coat", "doctor scrubs", "superhero cape",
  "wizard robe", "knight armor", "samurai armor",
  "ninja outfit", "pirate vest", "cowboy vest",
  "biker vest", "trench coat", "peacoat", "parka",
  "poncho", "kimono", "toga", "prison stripes",
  "referee shirt", "military uniform", "astronaut suit",
  "business suit", "bathrobe", "onesie", "apron",
  "overalls", "bare chest"
];

// 📿 30 NECK ITEMS
const NECK_ITEMS = [
  "gold chain", "silver chain", "pearl necklace",
  "diamond necklace", "beaded necklace", "dog tags",
  "pendant", "locket", "crystal necklace",
  "amulet", "bone necklace", "tooth necklace",
  "skull pendant", "coin necklace", "feather necklace",
  "seashell necklace", "leather cord", "choker",
  "bow tie", "necktie", "scarf",
  "bandana", "spiked collar", "medallion",
  "crucifix", "peace sign necklace", "whistle",
  "lei garland", "rope necklace", "no necklace"
];

// ✋ 50 HAND ITEMS
const HAND_ITEMS = [
  "sword", "katana", "axe", "hammer", "staff", "wand",
  "scepter", "shield", "bow and arrow", "dagger", "knife",
  "baseball bat", "hockey stick", "golf club", "tennis racket",
  "basketball", "football", "soccer ball", "torch",
  "lantern", "flashlight", "candle", "spellbook",
  "scroll", "map", "quill pen", "paintbrush",
  "microphone", "guitar", "electric guitar", "ukulele",
  "drumsticks", "trumpet", "pizza slice", "burger",
  "hot dog", "taco", "coffee cup", "beer mug",
  "soda can", "smartphone", "game controller",
  "wrench", "hammer tool", "trophy", "money bag",
  "briefcase", "gift box", "flowers", "empty hands"
];

// 🎭 15 EXPRESSIONS
const EXPRESSIONS = [
  "happy cheerful", "angry grumpy", "excited",
  "cool confident", "silly goofy", "mischievous",
  "sleepy tired", "surprised", "sad",
  "determined", "confused", "laughing",
  "nervous", "proud", "relaxed"
];

function getPersonalizedColor(fid: number) {
  return GOBLIN_COLOR_SCHEMES[fid % GOBLIN_COLOR_SCHEMES.length];
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function buildPrompt(colorSchemeHint?: { skin: string; bg: string }) {
  const colorScheme = colorSchemeHint || getRandomElement(GOBLIN_COLOR_SCHEMES);
  const skinColor = colorScheme.skin;
  const background = colorScheme.bg;
  const headItem = getRandomElement(HEAD_ITEMS);
  const eyeItem = getRandomElement(EYE_ITEMS);
  const mouthItem = getRandomElement(MOUTH_ITEMS);
  const clothing = getRandomElement(CLOTHING);
  const neckItem = getRandomElement(NECK_ITEMS);
  const handItem = getRandomElement(HAND_ITEMS);
  const expression = getRandomElement(EXPRESSIONS);

  // 🔥 OPTIMIZED PROMPT - Shorter but more effective!
  const prompt = `cute chibi goblin character, kawaii style, ${skinColor} smooth skin, round chubby blob body, small pointed ears, wearing ${headItem}, ${eyeItem}, ${mouthItem} showing fangs, wearing ${clothing}, ${neckItem}, holding ${handItem}, ${expression} expression, thick black outlines, flat 2D vector art, clean simple cartoon style, solid ${background} background, centered full body, sticker aesthetic, professional NFT artwork, children's book illustration style`;

  // 🔥 STRONG NEGATIVE - Focused on what matters
  const negative = `realistic, photorealistic, 3D render, CGI, detailed shading, complex lighting, shadows, gradient shading, depth, volumetric lighting, bokeh, blur, background scenery, landscape, buildings, multiple characters, text, watermark, logo, side view, profile, back view, angled view, muscular, athletic, tall, long limbs, human proportions, complex background, textured background, dramatic lighting, photography, painted, brush strokes, messy, sketchy, low quality, deformed, bad anatomy, extra limbs, floating objects, smoking, violence, blood, inappropriate`;

  return { prompt, negative };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fid = body?.fid;
    const pfpUrl = body?.pfpUrl;
    
    let selectedColorScheme: { skin: string; bg: string } | undefined;
    
    if (fid && typeof fid === 'number') {
      selectedColorScheme = getPersonalizedColor(fid);
      console.log("✅ Using FID-based color:", selectedColorScheme.skin);
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Missing REPLICATE_API_TOKEN" },
        { status: 500 }
      );
    }

    const { prompt, negative } = buildPrompt(selectedColorScheme);
    console.log("🎨 Generating Goblin NFT...");

    let output: any;

    if (pfpUrl) {
      console.log("🖼️ Using PFP for image-to-image:", pfpUrl);
      
      output = await replicate.run(
        "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        {
          input: {
            image: pfpUrl,
            prompt: prompt,
            negative_prompt: negative,
            prompt_strength: 0.98,  // Very strong
            num_inference_steps: 50,
            width: 1024,
            height: 1024,
            guidance_scale: 10.0,  // INCREASED - forces AI to follow prompt better!
          }
        }
      );
    } else {
      console.log("🎨 No PFP, using text-to-image");
      
      output = await replicate.run(
        "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        {
          input: {
            prompt: prompt,
            negative_prompt: negative,
            num_inference_steps: 50,
            width: 1024,
            height: 1024,
            guidance_scale: 9.0,
          }
        }
      );
    }

    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch generated image: ${imageResponse.status}` },
        { status: 502 }
      );
    }

    const imgBuf = Buffer.from(await imageResponse.arrayBuffer());
    const dataUrl = `data:image/png;base64,${imgBuf.toString("base64")}`;

    return NextResponse.json({
      generated_image_url: dataUrl,
      imageUrl: dataUrl,
      success: true
    });
  } catch (e: any) {
    console.error("Route error:", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
