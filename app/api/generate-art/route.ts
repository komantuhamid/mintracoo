export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

// 🎨 50 COLOR SCHEMES - Maximum variety
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

// 🎩 50 HEAD ITEMS - Maximum variety
const HEAD_ITEMS = [
  "wizard hat", "party hat", "crown", "baseball cap", "beanie",
  "viking helmet with horns", "cowboy hat", "chef hat tall white", 
  "santa hat red", "bucket hat", "fedora", "top hat",
  "pirate tricorn hat", "samurai helmet", "ninja hood",
  "beret", "sombrero", "headband", "bandana tied",
  "mohawk hairstyle", "backwards cap", "ski goggles on head",
  "flower crown", "tiara sparkly", "military helmet",
  "motorcycle helmet", "astronaut helmet", "construction hard hat",
  "witch hat pointy", "jester hat with bells", "pharaoh headdress",
  "laurel wreath", "halo glowing", "devil horns small",
  "cat ears", "bunny ears", "bear ears", "fox ears",
  "propeller beanie", "graduation cap", "chef toque",
  "turban wrapped", "bowler hat", "pork pie hat",
  "safari hat", "sun visor", "snapback cap", "trucker hat",
  "winter earmuffs", "bald head shiny"
];

// 👁️ 40 EYE ITEMS
const EYE_ITEMS = [
  "big round sparkling eyes", "sunglasses cool", "aviator goggles",
  "eye patch over one eye", "monocle fancy", "3D glasses red-blue",
  "heart-shaped glasses", "star-shaped sunglasses", "nerd glasses thick",
  "swimming goggles", "ski goggles", "steampunk goggles brass",
  "VR headset", "night vision goggles", "cat-eye glasses",
  "round John Lennon glasses", "rectangular glasses", "reading glasses",
  "jeweled monocle", "cracked monocle", "laser eyes glowing red",
  "glowing blue eyes bright", "glowing green eyes", "heterochromia different colored eyes",
  "spiral hypnotic eyes", "X eyes cartoon", "dollar sign eyes",
  "heart eyes lovestruck", "star eyes sparkling", "angry narrow eyes",
  "sleepy droopy eyes", "wide crazy eyes", "cyclops single giant eye",
  "compound insect eyes", "snake slit eyes", "robotic LED eyes",
  "blindfold over eyes", "bandage over eye", "makeup cat eye",
  "tears streaming", "winking one eye"
];

// 😁 35 MOUTH ITEMS
const MOUTH_ITEMS = [
  "big toothy grin showing fangs", "vampire fangs prominent",
  "cute smile small fangs", "tongue sticking out playful",
  "gold tooth shining", "braces on teeth metal",
  "gap in front teeth", "missing tooth", "buck teeth prominent",
  "zipper mouth", "stitched mouth", "fanged smile evil",
  "drooling mouth", "toothpick in mouth", "lollipop in mouth",
  "bubble gum bubble", "cigar (unlit) in mouth", "rose in mouth",
  "whistle in mouth", "harmonica in mouth", "grillz diamond teeth",
  "snarl showing all teeth", "laugh open mouth wide",
  "smile closed mouth", "smirk one corner up",
  "frown sad mouth", "grimace showing teeth", "pout lips",
  "kiss pursed lips", "neutral straight mouth", "open mouth surprised",
  "yawn big mouth open", "tongue out sideways", "forked snake tongue",
  "robotic speaker mouth"
];

// 👔 60 CLOTHING ITEMS - Maximum variety
const CLOTHING = [
  "hoodie casual", "t-shirt plain", "tank top", "muscle shirt",
  "leather jacket cool", "bomber jacket", "denim jacket",
  "vest formal", "cardigan cozy", "sweater knitted",
  "turtleneck", "polo shirt", "button-up shirt",
  "flannel shirt checkered", "hawaiian shirt floral", 
  "tie-dye shirt colorful", "band t-shirt", "sports jersey",
  "football jersey", "basketball jersey", "soccer jersey",
  "baseball uniform", "tracksuit jacket", "windbreaker",
  "suit jacket formal", "tuxedo fancy", "blazer",
  "lab coat white", "chef coat white", "doctor scrubs",
  "superhero cape", "wizard robe mystical", "witch robe dark",
  "knight armor metal", "samurai armor", "ninja outfit black",
  "pirate vest", "cowboy vest leather", "biker vest",
  "trench coat long", "peacoat", "parka winter",
  "poncho colorful", "kimono traditional", "toga roman",
  "prison uniform striped", "referee shirt", "lifeguard shirt red",
  "military uniform", "police uniform", "firefighter coat",
  "astronaut suit", "scuba wetsuit", "hazmat suit yellow",
  "business suit", "three-piece suit", "smoking jacket",
  "bathrobe fluffy", "onesie pajamas", "apron",
  "overalls denim", "suspenders", "bare chest"
];

// 📿 40 NECK ITEMS
const NECK_ITEMS = [
  "gold chain thick", "silver chain thin", "pearl necklace",
  "diamond necklace sparkling", "beaded necklace colorful",
  "dog tag chain military", "pendant necklace", "locket heart",
  "crystal necklace glowing", "amulet mystical", "talisman magical",
  "bone necklace tribal", "tooth necklace", "skull pendant",
  "coin necklace pirate", "feather necklace", "seashell necklace",
  "leather cord simple", "rope necklace thick", "choker tight",
  "bow tie formal", "necktie striped", "necktie polka dot",
  "ascot cravat", "bolo tie western", "scarf wrapped",
  "bandana around neck", "collar spiked", "collar studded",
  "turtleneck sweater collar", "medallion large", "crucifix necklace",
  "ankh symbol necklace", "yin yang necklace", "peace sign necklace",
  "whistle on chain", "compass on chain", "pocket watch chain",
  "lei flower garland", "bare neck nothing"
];

// ✋ 70 HAND ITEMS - Maximum variety!
const HAND_ITEMS = [
  "sword medieval", "katana samurai", "lightsaber glowing",
  "axe battle", "hammer war", "mace spiked",
  "staff wooden magical", "wand magic", "scepter royal",
  "shield round", "shield kite", "buckler small",
  "bow and arrow", "crossbow", "gun old west",
  "rifle hunting", "shotgun", "pistol revolver",
  "dagger curved", "knife hunting", "machete",
  "chainsaw", "baseball bat wooden", "cricket bat",
  "hockey stick", "golf club", "tennis racket",
  "basketball", "football", "soccer ball",
  "volleyball", "bowling ball", "bowling pin",
  "torch lit flame", "lantern glowing", "flashlight",
  "candle holder", "oil lamp", "camping lantern",
  "book thick spellbook", "scroll ancient", "map treasure",
  "quill pen", "paintbrush", "marker thick",
  "microphone", "guitar acoustic", "electric guitar",
  "bass guitar", "ukulele", "banjo",
  "drumsticks pair", "trumpet", "saxophone",
  "violin and bow", "flute", "harmonica",
  "pizza slice", "burger", "hot dog",
  "taco", "burrito", "sandwich",
  "coffee cup steaming", "beer mug foam", "wine glass",
  "soda can", "juice box", "water bottle",
  "smartphone modern", "tablet device", "game controller",
  "TV remote", "wrench tool", "hammer tool",
  "screwdriver", "plunger", "broom",
  "mop", "trophy gold", "medal gold",
  "money bag", "briefcase", "shopping bag",
  "gift box wrapped", "balloon bunch", "flowers bouquet",
  "empty hands relaxed", "fist clenched", "peace sign fingers",
  "thumbs up", "pointing finger", "waving hand"
];

// 🎭 15 EXPRESSIONS
const EXPRESSIONS = [
  "happy cheerful smile",
  "angry grumpy frown",
  "excited enthusiastic",
  "cool confident smirk",
  "silly goofy expression",
  "mischievous devious grin",
  "sleepy tired yawn",
  "surprised shocked wide-eyed",
  "sad melancholy frown",
  "determined focused serious",
  "confused puzzled",
  "laughing hysterical",
  "nervous sweating worried",
  "proud chest puffed",
  "relaxed chill laid-back"
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

  // 🔥 ULTIMATE NFT PROMPT
  const prompt = `masterpiece professional NFT digital artwork, adorable chibi goblin character, cute kawaii style, ${skinColor} smooth clean skin, round chubby blob body, wearing ${headItem} on head, ${eyeItem} on face, ${mouthItem} showing small cute fangs, wearing ${clothing} on body, ${neckItem} around neck, holding ${handItem} in hands, ${expression} facial expression, thick bold black outlines, clean vector art style, flat solid colors, sticker aesthetic, high quality character design, centered composition, full body visible, ${background} solid flat background, professional collectible art, NFT collection style, polished illustration, sharp crisp details, trending on artstation, perfect anatomy, symmetrical design`;

  // 🔥 ULTIMATE NEGATIVE PROMPT
  const negative = `realistic, photorealistic, photo, photograph, 3D render, CGI, cinema4d, blender, octane render, unreal engine, ugly, disgusting, deformed, mutated, disfigured, bad anatomy, wrong anatomy, extra limbs, extra arms, extra legs, missing limbs, missing arms, missing legs, fused fingers, too many fingers, long neck, elongated body, disproportionate, asymmetrical face, crooked, tilted, bad proportions, gross, scary, creepy, horror, nightmare, blurry, fuzzy, out of focus, low quality, low resolution, pixelated, jpeg artifacts, compression artifacts, noise, grainy, messy, sketchy, unfinished, draft, watermark, signature, text, words, letters, logo, username, artist name, copyright, frame, border, multiple characters, crowd, group, landscape, scenery, buildings, city, background objects, complex background, detailed background, gradient background, textured background, patterned background, vignette, shadow on ground, floor shadow, dramatic lighting, volumetric lighting, rim lighting, side view, profile view, back view, angled view, 3/4 view, looking away, turned head, muscular, athletic, tall, skinny, thin, human, person, realistic proportions, smoking, cigarette, cigar, weapon violence, blood, gore, nude, nsfw`;

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
    console.log("🎨 Generating ULTIMATE Goblin NFT...");

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
            prompt_strength: 0.97,  // Very strong transformation
            num_inference_steps: 50,  // Maximum quality
            width: 1024,
            height: 1024,
            guidance_scale: 9.5,  // Strong prompt adherence
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
            guidance_scale: 8.5,
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
