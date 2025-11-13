export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

const BASE_CHARACTER = "round blob goblin creature monster";

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

// 🎩 50 HEAD ITEMS
const HEAD_ITEMS = [
  "wizard hat on top of head", "party hat cone on top of head", "crown on top of head", 
  "baseball cap on top of head", "beanie knit cap on head", "viking helmet with horns on head",
  "cowboy hat on top of head", "chef hat tall white on head", "santa hat red on head",
  "bucket hat on top of head", "fedora on head", "top hat tall on head",
  "pirate tricorn hat on head", "samurai helmet on head", "ninja hood covering head",
  "beret tilted on head", "sombrero on top of head", "headband around head",
  "bandana tied on head", "mohawk hairstyle", "backwards cap on head",
  "flower crown on head", "tiara sparkly on head", "military helmet on head",
  "astronaut helmet on head", "construction hard hat on head", "witch hat pointy on head",
  "jester hat with bells on head", "laurel wreath on head", "halo glowing above head",
  "devil horns small on head", "cat ears on head", "bunny ears on head",
  "bear ears on head", "fox ears on head", "propeller beanie on head",
  "graduation cap on head", "turban wrapped on head", "bowler hat on head",
  "pork pie hat on head", "safari hat on head", "sun visor on head",
  "snapback cap on head", "trucker hat on head", "winter earmuffs on head",
  "viking horned helmet on head", "small iron crown on top of head", "fur hat on head",
  "bald head shiny no hat", "skull cap on top of head"
];

// 👁️ 40 EYE ITEMS
const EYE_ITEMS = [
  "big round sparkling eyes", "sunglasses cool over eyes", "aviator goggles over eyes",
  "small eye patch over one eye", "monocle fancy over one eye", "3D glasses red-blue over eyes",
  "heart-shaped glasses over eyes", "star-shaped sunglasses over eyes", "nerd glasses thick over eyes",
  "swimming goggles over eyes", "ski goggles over eyes", "steampunk goggles brass over eyes",
  "VR headset over eyes", "cat-eye glasses over eyes", "round glasses over eyes",
  "rectangular glasses over eyes", "reading glasses over eyes", "jeweled monocle over one eye",
  "cracked monocle over eye", "laser eyes glowing red", "glowing blue eyes bright",
  "glowing green eyes", "spiral hypnotic eyes", "X eyes cartoon",
  "dollar sign eyes", "heart eyes lovestruck", "star eyes sparkling",
  "angry narrow eyes", "sleepy droopy eyes", "wide crazy eyes bulging",
  "cyclops single giant eye", "snake slit eyes", "robotic LED eyes",
  "blindfold over eyes", "bandage covering one eye", "tiny aviator goggles over eyes",
  "large round yellow eyes", "small beady eyes glowing", "squinting menacing eyes"
];

// 😁 35 MOUTH ITEMS
const MOUTH_ITEMS = [
  "huge wide grinning mouth showing many sharp fangs", "giant open mouth with rows of jagged fangs",
  "massive toothy grin showing pointed fangs", "enormous mouth with multiple rows of sharp fangs",
  "wide crazy smile showing all sharp teeth", "evil grinning mouth with prominent fangs visible",
  "creepy smile with sharp jagged teeth", "menacing grin with big fangs",
  "wicked smile showing rows of teeth", "fierce grinning mouth with fangs",
  "vampire fangs protruding from mouth", "single gold tooth shining in grin",
  "missing front teeth gap in smile", "braces on teeth metal visible",
  "tongue sticking out cheeky", "buck teeth prominent", "zipper mouth",
  "stitched mouth", "fanged smile evil", "drooling mouth",
  "toothpick in mouth", "lollipop in mouth", "bubble gum bubble",
  "whistle in mouth", "grillz diamond teeth", "snarl showing all teeth",
  "laugh open mouth wide", "smile closed mouth", "smirk one corner up",
  "frown sad mouth", "grimace showing teeth", "pout lips",
  "neutral straight mouth", "open mouth surprised", "yawn big mouth open"
];

// 👔 60 CLOTHING ITEMS
const CLOTHING = [
  "small leather vest worn on torso", "tiny torn rags covering body", "simple cloth tunic on body",
  "hoodie casual on body", "t-shirt plain on body", "tank top on torso",
  "leather jacket cool on body", "bomber jacket on body", "denim jacket on torso",
  "vest formal on torso", "cardigan cozy on body", "sweater knitted on body",
  "turtleneck on torso", "polo shirt on body", "button-up shirt on body",
  "flannel shirt checkered on body", "hawaiian shirt floral on body", "tie-dye shirt colorful on body",
  "band t-shirt on torso", "sports jersey on body", "football jersey on torso",
  "basketball jersey on body", "soccer jersey on body", "baseball uniform on body",
  "tracksuit jacket on torso", "windbreaker on body", "suit jacket formal on torso",
  "tuxedo fancy on body", "blazer on torso", "lab coat white on body",
  "chef coat white on torso", "doctor scrubs on body", "superhero cape on shoulders",
  "wizard robe mystical on body", "witch robe dark on body", "knight armor metal on body",
  "samurai armor on body", "ninja outfit black on torso", "pirate vest on torso",
  "cowboy vest leather on body", "biker vest on torso", "trench coat long on body",
  "peacoat on body", "parka winter on torso", "poncho colorful on body",
  "kimono traditional on body", "toga roman on body", "prison uniform striped on body",
  "referee shirt on body", "lifeguard shirt red on body", "military uniform on body",
  "police uniform on body", "firefighter coat on body", "astronaut suit on body",
  "scuba wetsuit on body", "business suit on torso", "three-piece suit on body",
  "bathrobe fluffy on body", "onesie pajamas on body", "apron on body",
  "overalls denim on body", "bare chest showing chubby belly"
];

// 📿 40 NECK ITEMS
const NECK_ITEMS = [
  "small bone necklace around neck", "tiny iron collar around neck", "small tooth necklace on neck",
  "gold chain thick around neck", "silver chain thin on neck", "pearl necklace around neck",
  "diamond necklace sparkling on neck", "beaded necklace colorful around neck", "dog tag chain military on neck",
  "pendant necklace on neck", "locket heart on neck", "crystal necklace glowing on neck",
  "amulet mystical on neck", "talisman magical on neck", "skull pendant on neck",
  "coin necklace pirate on neck", "feather necklace on neck", "seashell necklace on neck",
  "simple leather cord around neck", "tiny gold chain on neck", "small bead necklace around neck",
  "rope necklace thick around neck", "choker tight around neck", "bow tie around neck",
  "necktie striped around neck", "necktie polka dot around neck", "bolo tie western around neck",
  "scarf wrapped around neck", "bandana around neck", "collar spiked around neck",
  "collar studded around neck", "medallion large on neck", "crucifix necklace on neck",
  "ankh symbol necklace on neck", "yin yang necklace on neck", "peace sign necklace on neck",
  "whistle on chain around neck", "compass on chain on neck", "lei flower garland around neck",
  "bare neck no necklace"
];

// ✋ 70 HAND ITEMS
const HAND_ITEMS = [
  "holding small rusty dagger in hand", "gripping tiny wooden club in hand", "holding small coin bag in hand",
  "holding tiny wooden shield in hand", "holding small torch in hand", "gripping tiny battle axe in hand",
  "holding small shortsword in hand", "gripping tiny iron mace in hand", "holding small wooden spear in hand",
  "sword medieval in hand", "katana samurai in hand", "axe battle in hand",
  "hammer war in hand", "staff wooden magical in hand", "wand magic in hand",
  "scepter royal in hand", "shield round in hand", "bow and arrow in hands",
  "dagger curved in hand", "knife hunting in hand", "machete in hand",
  "baseball bat wooden in hand", "hockey stick in hand", "golf club in hand",
  "tennis racket in hand", "basketball in hands", "football in hands",
  "soccer ball in hands", "torch lit flame in hand", "lantern glowing in hand",
  "flashlight in hand", "candle holder in hand", "book thick spellbook in hand",
  "scroll ancient in hand", "map treasure in hand", "quill pen in hand",
  "paintbrush in hand", "microphone in hand", "guitar acoustic in hands",
  "electric guitar in hands", "bass guitar in hands", "ukulele in hands",
  "drumsticks pair in hands", "trumpet in hand", "violin and bow in hands",
  "pizza slice in hand", "burger in hand", "hot dog in hand",
  "taco in hand", "sandwich in hand", "coffee cup steaming in hand",
  "beer mug foam in hand", "wine glass in hand", "soda can in hand",
  "smartphone modern in hand", "tablet device in hands", "game controller in hands",
  "wrench tool in hand", "hammer tool in hand", "screwdriver in hand",
  "broom in hand", "trophy gold in hand", "medal gold in hand",
  "money bag in hand", "briefcase in hand", "shopping bag in hand",
  "gift box wrapped in hand", "balloon bunch in hand", "flowers bouquet in hand",
  "empty hands nothing held", "both hands clenched in small fists", "peace sign fingers",
  "thumbs up gesture", "pointing finger", "waving hand"
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

  // 🔥 ULTRA-DETAILED PROMPT
  const prompt = [
    // Style directives
    "simple flat 2D cartoon illustration, clean vector art style",
    "thick black outlines, bold cartoon lines, simple coloring",
    "absolutely flat shading, NO gradients, NO depth",
    "completely flat illustration, zero dimension, pure 2D",
    "flat solid colors only, no shading variations",
    "children's book art style, storybook character",
    "vector graphic flat design, minimalist shading",
    "professional NFT artwork, collectible quality",
    "kawaii cute chibi style, adorable character design",

    // Character base
    `adorable ${BASE_CHARACTER} with ${skinColor} smooth skin`,
    
    // Body specifications
    "EXACT BODY DIMENSIONS: slightly oval blob body 400 pixels wide by 450 pixels tall",
    "body measures precisely 400px width by 450px height",
    "chubby belly is soft oval exactly 400 wide by 450 tall pixels",
    "body fills 45% of image height consistently",
    "EXACTLY TWO short stubby legs identical size",
    "each leg measures precisely 60 pixels tall 30 pixels wide",
    "EXACTLY TWO small rounded arms identical size",
    "each arm measures precisely 70 pixels long 25 pixels thick",
    "head is round sphere attached to body top",
    "head measures 180 pixels diameter exactly",
    "no muscle definition, soft pillowy cuddly body",
    "wide short squat stature, roly-poly blob build",

    // Features and accessories
    `${expression} facial expression`,
    "small pointed ears on sides of head",
    `${headItem}`,
    `${eyeItem}`,
    `${mouthItem}`,
    "mouth showing fangs teeth clearly visible",
    `${clothing}`,
    `${neckItem}`,
    `${handItem}`,

    // Positioning
    "all accessories in correct anatomical positions",
    "hat on head, eyes on face, mouth on face visible",
    "clothing on body, necklace on neck, weapon in hands",
    "facing directly forward straight ahead toward camera",
    "front view centered symmetrical pose",
    "standing upright full body visible",
    "looking straight at viewer, feet on ground",
    "stubby legs visible, centered composition",

    // Background enforcement
    `THE ENTIRE BACKGROUND MUST BE ${background}`,
    `BACKGROUND COLOR IS EXACTLY ${background}`,
    `${background} FILLS THE COMPLETE BACKGROUND`,
    `BACKGROUND IS ${background} SOLID COLOR`,
    "background is completely flat solid color",
    "no background shading, no background gradient",
    "background has zero depth or dimension",
    `solid ${background} backdrop fills entire image`,
    
    "simple cartoon mascot blob monster character"
  ].join(", ");

  // 🔥 ULTRA-COMPREHENSIVE NEGATIVE PROMPT
  const negative = [
    "3D render, CGI, realistic, photorealistic, detailed",
    
    // Anti-shading
    "complex shading, dramatic lighting, shadows, depth",
    "gradient shading, soft shading, ambient occlusion",
    "drop shadow, cast shadow, shadow under character",
    "shading at bottom, darkening at edges, vignette",
    "3D lighting, volumetric lighting, rim lighting",
    "depth of field, blur, bokeh, atmospheric perspective",
    "ground shadow, floor reflection, depth effect",
    "dimensional shading, spherical shading, rounded shading",
    "ambient shadows, contact shadows, soft shadows",
    "radial gradient, color gradient in background",
    
    // Anti-realistic
    "detailed texture, fur strands, hair detail, realistic skin",
    "cinematic lighting, photography, studio lighting",
    "painted, brush strokes, oil painting, watercolor",
    "blurry, low quality, messy, sketchy, unfinished",
    "text, watermark, logo, signature, frame, border",
    
    // Anti-composition
    "multiple characters, cropped, background scenery",
    "side view, profile, turned sideways, angled",
    "3/4 view, looking sideways, facing left or right",
    "back view, rear view, turned around, rotated",
    
    // Anti-body variation
    "different body sizes, varying body proportions",
    "inconsistent body dimensions, irregular body size",
    "body too large, body too small, wrong body size",
    "oversized body, undersized body, mismatched proportions",
    "body bigger than 450 pixels tall, body smaller than 400 pixels wide",
    "body not oval, elongated body, stretched vertically too much",
    "tall body, extremely stretched body, compressed body, squashed body",
    "different leg sizes, uneven legs, asymmetrical legs",
    "different arm sizes, uneven arms, asymmetrical arms",
    "large head, tiny head, wrong head size, head too big",
    
    // Anti-muscular
    "muscular, athletic, fit, toned, abs visible",
    "muscle definition, biceps, six pack, defined",
    "tall, long limbs, stretched, slender, lanky",
    "thin, skinny, slim, lean, human proportions",
    
    // Anti-background complexity
    "gradient background, textured backdrop, complex scene",
    "background scenery, background objects, detailed background",
    "WRONG: different background color, mismatched colors",
    "WRONG: background different from character color",
    "WRONG: background with depth, background with shadow",
    "WRONG: background gradient from light to dark",
    "WRONG: any variation in background color",
    "multicolored background, rainbow background, patterned background",
    "background scenery, landscape, environment details",
    "background elements, objects in background, props",
    "white background, black background when character is colored",
    "gray background when character is colored",
    "neutral background, plain background, blank background",
    
    // Anti-inappropriate
    "smoking, cigarette, cigar, tobacco",
    "floating accessories, misplaced items",
    "violence, blood, gore, weapons violence",
    "nude, nsfw, inappropriate"
  ].join(", ");

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
            prompt_strength: 0.97,
            num_inference_steps: 50,
            width: 1024,
            height: 1024,
            guidance_scale: 9.5,
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
