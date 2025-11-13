export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

// ✅ Use Replicate for img2img
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

const BASE_CHARACTER = "round blob goblin creature monster";


// 🎨 72 COLOR SCHEMES (MONOCHROMATIC - MATCHING BACKGROUND)
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
  "small leather cap on top of head", "tiny metal helmet on top of head",
  "cloth hood covering head", "small bandana on head",
  "bone helmet on top of head", "small iron crown on top of head",
  "wizard hat on top of head", "fur hat on head",
  "small horned helmet on head", "skull cap on top of head",
  "straw hat on head", "pointed hood covering head",
  "war paint marks on face", "animal pelt on head",
  "bald head no hat", "viking helmet with horns on head",
  "cowboy hat on top of head", "pirate tricorn hat on head",
  "chef hat tall white on head", "baseball cap worn backwards on head",
  "bucket hat on top of head", "beanie knit cap on head",
  "beret tilted on head", "sombrero on top of head",
  "top hat tall on head", "fedora hat on head",
  "samurai kabuto helmet on head", "ninja hood covering head",
  "santa hat red on head", "party hat cone on head"
];

const EYE_ITEMS = [
  "small eye patch over one eye", "tiny goggles over eyes",
  "small monocle over one eye", "round glasses over eyes",
  "bandage covering one eye", "tiny aviator goggles over eyes",
  "large round yellow eyes", "small beady eyes glowing",
  "wide crazy eyes bulging", "squinting menacing eyes",
  "sunglasses cool over eyes", "3D glasses red-blue over eyes",
  "steampunk goggles brass over eyes", "cyclops single giant eye",
  "heart-shaped glasses over eyes", "ski goggles over eyes",
  "swimming goggles over eyes", "VR headset over eyes",
  "laser eyes glowing red", "star-shaped sunglasses over eyes",
  "cat-eye glasses over eyes", "jeweled monocle over one eye",
  "cracked monocle over eye", "glowing blue eyes bright",
  "X-ray specs over eyes"
];

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
  "vampire fangs protruding from mouth",
  "single gold tooth shining in grin",
  "missing front teeth gap in smile",
  "braces on teeth metal visible",
  "tongue sticking out cheeky"
];

const CLOTHING = [
  "small leather vest worn on torso", "tiny torn rags covering body",
  "simple cloth tunic on body", "small fur vest on torso",
  "simple leather jerkin on body", "tiny torn robes on body",
  "small patchwork leather on body", "tiny animal hide covering torso",
  "simple torn shirt on body", "small iron armor on torso",
  "tiny torn cloak over shoulders", "simple leather coat on body",
  "small pirate vest on torso", "tiny sailor vest on body",
  "bare chest showing chubby belly", "hawaiian shirt floral on body",
  "tuxedo jacket fancy on torso", "hoodie with hood down on body",
  "tank top sleeveless on torso", "sweater knitted on body",
  "denim jacket on torso", "bomber jacket on body",
  "tracksuit jacket on torso", "polo shirt collared on body",
  "football jersey on torso", "basketball jersey on body",
  "chef coat white on torso", "lab coat white on body",
  "ninja suit black on torso", "samurai armor on body",
  "superhero cape on shoulders", "wizard robe long on body",
  "monk robe brown on body", "kimono traditional on body",
  "poncho over shoulders"
];

const NECK_ITEMS = [
  "small bone necklace around neck", "tiny iron collar around neck",
  "small tooth necklace on neck", "simple leather cord around neck",
  "tiny gold chain on neck", "small bead necklace around neck",
  "tiny medallion hanging on neck", "small skull pendant on neck",
  "simple rope around neck", "bare neck no necklace",
  "thick gold chain heavy on neck", "diamond necklace sparkling on neck",
  "pearl necklace elegant around neck", "dog tag chain military on neck",
  "crucifix necklace on neck", "locket heart-shaped on neck",
  "crystal pendant glowing on neck", "amulet mystical on neck",
  "coin necklace pirate on neck", "feather necklace tribal on neck",
  "seashell necklace beach on neck", "dog collar spiked around neck",
  "bow tie around neck", "necktie striped around neck",
  "scarf wrapped around neck", "bandana around neck",
  "silver chain thin on neck", "rope necklace thick around neck",
  "gemstone necklace colorful on neck", "choker tight around neck"
];

const HAND_ITEMS = [
  "holding small rusty dagger in hand", "gripping tiny wooden club in hand",
  "holding small coin bag in hand", "holding tiny wooden shield in hand",
  "holding small torch in hand", "gripping tiny battle axe in hand",
  "holding small shortsword in hand", "gripping tiny iron mace in hand",
  "holding small wooden spear in hand", "holding tiny bow in hand",
  "holding small loot sack in hand", "holding tiny lantern in hand",
  "holding small skull cup in hand", "holding tiny potion vial in hand",
  "gripping tiny pickaxe in hand", "holding small meat leg in hand",
  "holding small keys in hand", "holding small bottle in hand",
  "gripping tiny hammer in hand", "both hands clenched in small fists",
  "holding smartphone in hand", "gripping game controller in hands",
  "holding coffee cup in hand", "gripping microphone in hand",
  "holding pizza slice in hand", "holding burger in hand",
  "gripping baseball bat in hand", "holding tennis racket in hand",
  "gripping guitar in hands", "holding drumsticks in hands",
  "holding book in hand", "gripping pen writing in hand",
  "holding magnifying glass in hand", "gripping wrench tool in hand",
  "empty hands nothing held"
];

const EXPRESSIONS = [
  "angry scowling", 
  "evil grinning maniacally",
  "grumpy frowning", 
  "crazy laughing wild",
  "sneaky smirking", 
  "confused dumb",
  "aggressive menacing",
  "proud confident",
  "surprised shocked wide-eyed",
  "sleepy tired yawning",
  "excited happy beaming", 
  "nervous sweating worried",
  "silly goofy derpy", 
  "cool relaxed chill",
  "mischievous plotting devious"
];

function getPersonalizedColor(fid: number): { skin: string; bg: string } {
  const colorIndex = fid % GOBLIN_COLOR_SCHEMES.length;
  const selectedScheme = GOBLIN_COLOR_SCHEMES[colorIndex];
  console.log(`🎨 FID ${fid} → Color Index ${colorIndex} → ${selectedScheme.skin}`);
  return selectedScheme;
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

  const prompt = [
    // 🔥 ULTRA-FLAT STYLE
    `simple flat 2D cartoon illustration, clean vector art style`,
    `thick black outlines, bold cartoon lines, simple coloring`,
    `absolutely flat shading, NO gradients, NO depth`,
    `completely flat illustration, zero dimension, pure 2D`,
    `flat solid colors only, no shading variations`,
    `children's book art style,  storybook character`,
    `vector graphic flat design, minimalist shading`,

    `adorable ${BASE_CHARACTER} with ${skinColor} smooth skin`;
	
  const negative = `realistic, photorealistic, 3D, CGI, landscape, scenery, buildings, complex background, human, person, detailed shading, gradient background`;

  return { prompt, negative };
}

// ✅ Image-to-Image using Replicate
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
            prompt_strength: 0.98,  // ✅ INCREASED from 0.75 to 0.98 - MUCH stronger transformation
            num_inference_steps: 50,  // ✅ INCREASED from 30 to 50 - better quality
            width: 1024,
            height: 1024,
            guidance_scale: 9.0,  // ✅ INCREASED from 7.5 to 9.0 - stronger prompt adherence
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
            num_inference_steps: 40,
            width: 1024,
            height: 1024,
            guidance_scale: 8.0,
          }
        }
      );
    }

    const imageUrl = Array.isArray(output) ? output : output;

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
