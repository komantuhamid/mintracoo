export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

const BASE_CHARACTER = "round blob goblin creature monster";

// 🎨 72 COLOR SCHEMES (SAME AS BEFORE)
const GOBLIN_COLOR_SCHEMES = [
  { skin: "bright neon lime green glowing", bg: "bright neon lime green glowing" },
  { skin: "dark forest green deep", bg: "dark forest green deep" },
  { skin: "mint green pastel light", bg: "mint green pastel light" },
  { skin: "olive green earthy", bg: "olive green earthy" },
  { skin: "emerald green rich vibrant", bg: "emerald green rich vibrant" },
  { skin: "sage green muted soft", bg: "sage green muted soft" },
  { skin: "chartreuse yellow-green bright", bg: "chartreuse yellow-green bright" },
  { skin: "jade green medium", bg: "jade green medium" },
  { skin: "cobalt blue bright electric", bg: "cobalt blue bright electric" },
  { skin: "navy blue dark deep", bg: "navy blue dark deep" },
  { skin: "cyan blue light bright", bg: "cyan blue light bright" },
  { skin: "teal turquoise blue-green", bg: "teal turquoise blue-green" },
  { skin: "sky blue pastel light", bg: "sky blue pastel light" },
  { skin: "royal blue rich vibrant", bg: "royal blue rich vibrant" },
  { skin: "violet purple bright", bg: "violet purple bright" },
  { skin: "deep purple dark rich", bg: "deep purple dark rich" },
  { skin: "lavender purple pastel", bg: "lavender purple pastel" },
  { skin: "magenta purple-pink bright", bg: "magenta purple-pink bright" },
  { skin: "indigo purple-blue deep", bg: "indigo purple-blue deep" },
  { skin: "crimson red bright", bg: "crimson red bright" },
  { skin: "dark red maroon deep", bg: "dark red maroon deep" },
  { skin: "orange bright vibrant", bg: "orange bright vibrant" },
  { skin: "coral orange-pink", bg: "coral orange-pink" },
  { skin: "rust orange-brown", bg: "rust orange-brown" },
  { skin: "charcoal gray dark", bg: "charcoal gray dark" },
  { skin: "slate gray medium", bg: "slate gray medium" },
  { skin: "bone white pale cream", bg: "bone white pale cream" },
  { skin: "jet black dark", bg: "jet black dark" },
  { skin: "golden yellow bright", bg: "golden yellow bright" },
  { skin: "mustard yellow earthy", bg: "mustard yellow earthy" },
  { skin: "lemon yellow pale", bg: "lemon yellow pale" },
  { skin: "chocolate brown dark", bg: "chocolate brown dark" },
  { skin: "tan brown light", bg: "tan brown light" },
  { skin: "mahogany red-brown deep", bg: "mahogany red-brown deep" },
  { skin: "hot pink bright vibrant", bg: "hot pink bright vibrant" },
  { skin: "rose pink soft", bg: "rose pink soft" },
  { skin: "pastel pink soft baby light", bg: "pastel pink soft baby light" },
  { skin: "pastel blue soft powder light", bg: "pastel blue soft powder light" },
  { skin: "pastel mint green soft light", bg: "pastel mint green soft light" },
  { skin: "pastel lavender purple soft light", bg: "pastel lavender purple soft light" },
  { skin: "pastel peach orange soft light", bg: "pastel peach orange soft light" },
  { skin: "pastel lemon yellow soft light", bg: "pastel lemon yellow soft light" },
  { skin: "pastel lilac purple soft light", bg: "pastel lilac purple soft light" },
  { skin: "pastel aqua blue-green soft light", bg: "pastel aqua blue-green soft light" },
  { skin: "pastel coral pink-orange soft light", bg: "pastel coral pink-orange soft light" },
  { skin: "pastel sage green soft light", bg: "pastel sage green soft light" },
  { skin: "pastel periwinkle blue-purple soft light", bg: "pastel periwinkle blue-purple soft light" },
  { skin: "pastel ivory cream soft light", bg: "pastel ivory cream soft light" },
  { skin: "neon pink hot bright glowing electric", bg: "neon pink hot bright glowing electric" },
  { skin: "neon green lime bright glowing electric", bg: "neon green lime bright glowing electric" },
  { skin: "neon blue cyan bright glowing electric", bg: "neon blue cyan bright glowing electric" },
  { skin: "neon yellow bright glowing electric", bg: "neon yellow bright glowing electric" },
  { skin: "neon orange bright glowing electric", bg: "neon orange bright glowing electric" },
  { skin: "neon purple bright glowing electric", bg: "neon purple bright glowing electric" },
  { skin: "neon magenta bright glowing electric", bg: "neon magenta bright glowing electric" },
  { skin: "neon turquoise bright glowing electric", bg: "neon turquoise bright glowing electric" },
  { skin: "neon red bright glowing electric", bg: "neon red bright glowing electric" },
  { skin: "neon chartreuse yellow-green glowing electric", bg: "neon chartreuse yellow-green glowing electric" },
  { skin: "neon fuchsia pink-purple glowing electric", bg: "neon fuchsia pink-purple glowing electric" },
  { skin: "neon aqua blue-green glowing electric", bg: "neon aqua blue-green glowing electric" },
  { skin: "metallic gold shiny gleaming", bg: "metallic gold shiny gleaming" },
  { skin: "metallic silver shiny gleaming", bg: "metallic silver shiny gleaming" },
  { skin: "metallic bronze copper shiny", bg: "metallic bronze copper shiny" },
  { skin: "metallic rose gold pink shiny", bg: "metallic rose gold pink shiny" },
  { skin: "metallic platinum silver-white shiny", bg: "metallic platinum silver-white shiny" },
  { skin: "metallic copper orange shiny", bg: "metallic copper orange shiny" },
  { skin: "metallic chrome silver mirror shiny", bg: "metallic chrome silver mirror shiny" },
  { skin: "metallic brass yellow shiny", bg: "metallic brass yellow shiny" },
  { skin: "metallic titanium gray shiny", bg: "metallic titanium gray shiny" },
  { skin: "metallic pearl white iridescent shiny", bg: "metallic pearl white iridescent shiny" },
  { skin: "metallic gunmetal dark gray shiny", bg: "metallic gunmetal dark gray shiny" },
  { skin: "metallic champagne gold-beige shiny", bg: "metallic champagne gold-beige shiny" }
];

const HEAD_ITEMS = [
  "wizard hat", "party hat", "crown", "baseball cap", "beanie",
  "viking helmet with horns", "cowboy hat", "chef hat",
  "skull cap", "straw hat", "hood", "war paint",
  "animal pelt", "bald head", "pirate hat",
  "bucket hat", "beret", "sombrero",
  "top hat", "fedora", "samurai helmet", "ninja hood",
  "santa hat", "party cone", "bandana", "fur hat",
  "horned helmet", "iron crown", "leather cap", "metal helmet"
];

const EYE_ITEMS = [
  "eye patch", "goggles", "monocle", "round glasses",
  "bandage over eye", "aviator goggles", "large round eyes",
  "beady glowing eyes", "wide crazy eyes", "squinting eyes",
  "sunglasses", "3D glasses", "steampunk goggles", "cyclops eye",
  "heart glasses", "ski goggles", "swimming goggles", "VR headset",
  "laser eyes", "star sunglasses", "cat-eye glasses", "jeweled monocle",
  "cracked monocle", "glowing blue eyes", "X-ray specs"
];

const MOUTH_ITEMS = [
  "wide grin showing sharp pointed fangs",
  "huge open mouth with rows of jagged fangs",
  "big toothy grin with vampire fangs",
  "enormous gaping mouth with multiple sharp fangs",
  "crazy smile showing all sharp teeth and fangs",
  "evil grinning mouth with prominent fangs visible",
  "creepy smile with sharp jagged fangs",
  "menacing grin with big pointed fangs",
  "wicked smile showing rows of sharp teeth",
  "fierce grinning mouth with fangs",
  "vampire fangs protruding", "gold tooth shining",
  "missing teeth gap", "braces on teeth", "tongue sticking out"
];

const CLOTHING = [
  "leather vest", "torn rags", "cloth tunic", "fur vest",
  "leather jerkin", "torn robes", "patchwork leather", "animal hide",
  "torn shirt", "iron armor", "torn cloak", "leather coat",
  "pirate vest", "sailor vest", "bare chest", "hawaiian shirt",
  "tuxedo", "hoodie", "tank top", "sweater",
  "denim jacket", "bomber jacket", "tracksuit", "polo shirt",
  "football jersey", "basketball jersey", "chef coat", "lab coat",
  "ninja suit", "samurai armor", "superhero cape", "wizard robe",
  "monk robe", "kimono", "poncho"
];

const NECK_ITEMS = [
  "bone necklace", "iron collar", "tooth necklace", "leather cord",
  "gold chain", "bead necklace", "medallion", "skull pendant",
  "rope", "no necklace", "thick chain", "diamond necklace",
  "pearl necklace", "dog tags", "crucifix", "locket",
  "crystal pendant", "amulet", "coin necklace", "feather necklace",
  "seashell necklace", "spiked collar", "bow tie", "necktie",
  "scarf", "bandana", "silver chain", "gemstone necklace", "choker"
];

const HAND_ITEMS = [
  "rusty dagger", "wooden club", "coin bag", "wooden shield",
  "torch", "battle axe", "shortsword", "iron mace",
  "wooden spear", "bow", "loot sack", "lantern",
  "skull cup", "potion vial", "pickaxe", "meat leg",
  "keys", "bottle", "hammer", "clenched fists",
  "smartphone", "game controller", "coffee cup", "microphone",
  "pizza slice", "burger", "baseball bat", "tennis racket",
  "guitar", "drumsticks", "book", "pen",
  "magnifying glass", "wrench", "empty hands", "peace sign",
  "thumbs up", "pointing finger", "waving hand"
];

const EXPRESSIONS = [
  "happy cheerful smiling",
  "angry grumpy mad scowling",
  "excited enthusiastic beaming",
  "nervous sweating worried anxious",
  "silly goofy derpy playful",
  "cool relaxed chill confident",
  "mischievous plotting devious sneaky"
];

function getPersonalizedColor(fid: number): { skin: string; bg: string } {
  const colorIndex = fid % GOBLIN_COLOR_SCHEMES.length;
  return GOBLIN_COLOR_SCHEMES[colorIndex];
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

  // 🔥 ULTRA-DETAILED PROFESSIONAL NFT PROMPT
  const prompt = `professional high quality NFT character artwork, adorable cute chibi ${BASE_CHARACTER}, ${skinColor} smooth clean skin tone, round chubby blob body shape, PROMINENT POINTED GOBLIN EARS clearly visible on sides of head, small goblin features, goblin-like appearance with monster traits, wearing ${headItem} on head, ${eyeItem} on face, ${mouthItem} clearly visible and prominent, wearing ${clothing} on body, ${neckItem} around neck area, holding ${handItem} in hands, ${expression} facial expression, thick bold black outlines, clean 2D flat cartoon illustration style, solid flat colors no complex shading, simple cel shading, sticker-like aesthetic, kawaii cute character design, full body standing centered composition, front-facing view looking at viewer, stubby short legs visible, small rounded arms visible, monochromatic solid ${background} background filling entire image, character and background same exact color tone, professional collectible NFT art quality, polished digital artwork, clean simple design`;

  // 🔥 COMPREHENSIVE NEGATIVE PROMPT
  const negative = `realistic, photorealistic, photograph, 3D render, CGI, Unreal Engine, Blender render, overly complex shading, dramatic lighting, harsh shadows, volumetric lighting, ray tracing, depth of field, bokeh, blur, gradient background, textured background, patterned background, detailed background scenery, landscape, environment, buildings, objects in background, multiple characters, crowd, text, watermark, logo, signature, artist name, side view, profile view, back view, 3/4 view, angled view, turned sideways, looking away, muscular, athletic body, fit, toned, tall, long limbs, human proportions, stretched, elongated, thin, skinny, no ears visible, ears missing, hidden ears, ears covered completely, messy, sketchy, rough, unfinished, low quality, bad anatomy, deformed, mutated, extra limbs, missing limbs, floating accessories, misplaced items, smoking, cigarette, violence, blood, gore, inappropriate, different background color from character, contrasting background, wrong background color, background not matching character color`;

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
    console.log("🎨 Generating PROFESSIONAL Goblin NFT...");

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
            prompt_strength: 0.88,  // Strong but balanced
            num_inference_steps: 50,
            width: 1024,
            height: 1024,
            guidance_scale: 8.5,  // Strong guidance
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
            guidance_scale: 8.0,
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
