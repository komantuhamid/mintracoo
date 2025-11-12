export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

const BASE_CHARACTER = "goblin monster with a chubby body";

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

// ALL ACCESSORIES (190 total)
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
  "holding pizza slice in hand", "gripping magic wand in hand",
  "holding book open in hand", "gripping telescope in hand",
  "holding magnifying glass in hand", "gripping fishing rod in hand",
  "holding basketball in hands", "gripping baseball bat in hand",
  "holding trophy golden in hand", "gripping drumsticks in hands",
  "holding guitar small in hand", "gripping paintbrush in hand",
  "holding camera in hand", "gripping sword katana in hand",
  "holding gem crystal in hand", "gripping staff wooden in hand"
];

const EXPRESSIONS = [
  "angry scowling", "evil grinning maniacally",
  "grumpy frowning", "crazy laughing wild",
  "sneaky smirking", "confused dumb",
  "aggressive menacing", "proud confident",
  "surprised shocked wide-eyed", "sleepy tired yawning",
  "excited happy beaming", "nervous sweating worried",
  "silly goofy derpy", "cool relaxed chill",
  "mischievous plotting devious"
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
  
  const prompt = [
    // 🔥 ULTRA-FLAT STYLE
    "simple flat 2D cartoon illustration, clean vector art style",
    "thick black outlines, bold cartoon lines, simple coloring",
    "absolutely flat shading, NO gradients, NO depth",
    "completely flat illustration, zero dimension, pure 2D",
    "flat solid colors only, no shading variations",
    "children's book art style, cute storybook character",
    "vector graphic flat design, minimalist shading",

    `adorable ${BASE_CHARACTER} with ${skinColor} smooth skin`,
    
    // 🔥 BODY SIZE - SLIGHTLY TALLER (400x450px)
    "EXACT BODY DIMENSIONS: slightly oval blob body 400 pixels wide by 450 pixels tall",
    "body measures precisely 400px width by 450px height",
    "body is gently oval shape 400x450 pixels maintaining cute proportions",
    "chubby belly is soft oval exactly 400 wide by 450 tall pixels",
    "body fills 45% of image height consistently",
    "oval torso measures 400 pixels wide by 450 pixels tall EXACT",
    "blob body is standard size 400x450px gentle oval ALWAYS",
    "EXACTLY TWO short stubby legs identical size",
    "each leg measures precisely 60 pixels tall 30 pixels wide",
    "EXACTLY TWO small rounded arms identical size",
    "each arm measures precisely 70 pixels long 25 pixels thick",
    "head is round sphere attached to body top",
    "head measures 180 pixels diameter exactly",
    
    "no muscle definition, soft pillowy cuddly body",
    "wide short squat stature, roly-poly blob build",

    `${expression} facial expression`,
    "small pointed ears on sides of head",
    `${headItem}`,
    `${eyeItem}`,
    `${mouthItem}`,
    "mouth showing fangs teeth clearly visible",
    `${clothing}`,
    `${neckItem}`,
    `${handItem}`,

    "all accessories in correct anatomical positions",
    "hat on head, eyes on face, mouth on face visible",
    "clothing on body, necklace on neck, weapon in hands",
    "facing directly forward straight ahead toward camera",
    "front view centered symmetrical pose",
    "standing upright full body visible",
    "looking straight at viewer, feet on ground",
    "stubby legs visible, centered composition",

    // 🔥🔥🔥 ULTRA-ENFORCED BACKGROUND COLOR MATCHING
    `THE ENTIRE BACKGROUND MUST BE ${skinColor}`,
    `BACKGROUND COLOR IS EXACTLY ${background}`,
    `${skinColor} FILLS THE COMPLETE BACKGROUND`,
    `BACKGROUND IS ${background} SOLID COLOR`,
    "CRITICAL: background is identical color to character skin",
    "MANDATORY: character and background are SAME EXACT color",
    "REQUIRED: perfect monochromatic single-color scheme",
    "ENFORCED: zero color difference between character and background",
    "ABSOLUTE: character blends into background color perfectly",
    "STRICT: background is completely flat solid color",
    "CRUCIAL: no background shading, no background gradient",
    "ESSENTIAL: background has zero depth or dimension",
    "background color matches character skin color 100%",
    "background and character share identical color palette",
    "monochromatic color scheme background equals character",
    `solid ${background} backdrop fills entire image`,
    `${skinColor} environment surrounds character completely`,
    "background tone matches character tone perfectly",
    "unified color scheme across entire composition",
    "seamless color integration background to foreground",
    
    "simple cartoon mascot cute blob monster character"
  ].join(", ");

  const negative = [
    "3D render, CGI, realistic, photorealistic, detailed",
    
    // 🔥 ULTRA-STRONG ANTI-SHADING
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
    "detailed texture, fur strands, hair detail, realistic skin",
    "cinematic lighting, photography, studio lighting",
    "painted, brush strokes, oil painting, watercolor",
    "blurry, low quality, messy, sketchy, unfinished",
    "text, watermark, logo, signature, frame, border",
    "multiple characters, cropped, background scenery",
    "side view, profile, turned sideways, angled",
    "3/4 view, looking sideways, facing left or right",
    "back view, rear view, turned around, rotated",
    
    // 🔥 ANTI-INCONSISTENT BODY SIZE
    "different body sizes, varying body proportions",
    "inconsistent body dimensions, irregular body size",
    "body too large, body too small, wrong body size",
    "oversized body, undersized body, mismatched proportions",
    "body bigger than 450 pixels tall, body smaller than 400 pixels wide",
    "body not oval, elongated body, stretched vertically too much",
    "tall body, extremely stretched body, compressed body, squashed body",
    "different leg sizes, uneven legs, asymmetrical legs",
    "one leg bigger, one leg smaller, varying leg length",
    "different arm sizes, uneven arms, asymmetrical arms",
    "one arm bigger, one arm smaller, varying arm length",
    "large head, tiny head, wrong head size, head too big",
    
    "muscular, athletic, fit, toned, abs visible",
    "muscle definition, biceps, six pack, defined",
    "tall, long limbs, stretched, slender, lanky",
    "thin, skinny, slim, lean, human proportions",
    "cigar, pipe, smoking, cigarette, tobacco",
    "floating accessories, misplaced items",
    "hat floating, clothing on wrong body part",

    // 🔥🔥🔥 ULTRA-STRONG BACKGROUND COLOR NEGATIVES
    "gradient background, textured backdrop, complex scene",
    "background scenery, background objects, detailed background",
    "WRONG: different background color, mismatched colors",
    "WRONG: background different from character color",
    "WRONG: background lighter than character",
    "WRONG: background darker than character",
    "WRONG: background brighter than character",
    "WRONG: background duller than character",
    "WRONG: contrasting background, complementary colors",
    "WRONG: two-tone color scheme, multi-color palette",
    "WRONG: color variation, color gradient, color difference",
    "WRONG: background has different shade or tone",
    "WRONG: wrong background color, incorrect background color",
    "WRONG: background with depth, background with shadow",
    "WRONG: background gradient from light to dark",
    "WRONG: background shading, background vignette",
    "WRONG: darker background at bottom, lighter at top",
    "WRONG: any variation in background color",
    "multicolored background, rainbow background, patterned background",
    "background scenery, landscape, environment details",
    "background elements, objects in background, props",
    "colored borders, colored frames, colored edges",
    "white background, black background when character is colored",
    "gray background when character is colored",
    "neutral background, plain background, blank background",
    "different hue background, different saturation background",
    "background color not matching character at all"
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
    console.log("🎨 Generating Slightly Taller Goblin NFT (400x450px)...");
    
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
