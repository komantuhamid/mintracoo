export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";
import sharp from "sharp";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

const BASE_CHARACTER = "menacing scary goblin monster creature";

// 🎨 72 COLOR SCHEMES
const GOBLIN_COLOR_SCHEMES = [
  { skin: "bright neon lime green glowing", bg: "bright neon lime green glowing", hex: "#39FF14" },
  { skin: "dark forest green deep", bg: "dark forest green deep", hex: "#0B4A1F" },
  { skin: "mint green pastel light", bg: "mint green pastel light", hex: "#98FF98" },
  { skin: "olive green earthy", bg: "olive green earthy", hex: "#556B2F" },
  { skin: "emerald green rich vibrant", bg: "emerald green rich vibrant", hex: "#50C878" },
  { skin: "sage green muted soft", bg: "sage green muted soft", hex: "#9DC183" },
  { skin: "chartreuse yellow-green bright", bg: "chartreuse yellow-green bright", hex: "#7FFF00" },
  { skin: "jade green medium", bg: "jade green medium", hex: "#00A86B" },
  { skin: "cobalt blue bright electric", bg: "cobalt blue bright electric", hex: "#0047AB" },
  { skin: "navy blue dark deep", bg: "navy blue dark deep", hex: "#000080" },
  { skin: "cyan blue light bright", bg: "cyan blue light bright", hex: "#00FFFF" },
  { skin: "teal turquoise blue-green", bg: "teal turquoise blue-green", hex: "#008080" },
  { skin: "sky blue pastel light", bg: "sky blue pastel light", hex: "#87CEEB" },
  { skin: "royal blue rich vibrant", bg: "royal blue rich vibrant", hex: "#4169E1" },
  { skin: "violet purple bright", bg: "violet purple bright", hex: "#8B00FF" },
  { skin: "deep purple dark rich", bg: "deep purple dark rich", hex: "#4B0082" },
  { skin: "lavender purple pastel", bg: "lavender purple pastel", hex: "#E6E6FA" },
  { skin: "magenta purple-pink bright", bg: "magenta purple-pink bright", hex: "#FF00FF" },
  { skin: "indigo purple-blue deep", bg: "indigo purple-blue deep", hex: "#4B0082" },
  { skin: "crimson red bright", bg: "crimson red bright", hex: "#DC143C" },
  { skin: "dark red maroon deep", bg: "dark red maroon deep", hex: "#800000" },
  { skin: "orange bright vibrant", bg: "orange bright vibrant", hex: "#FF8C00" },
  { skin: "coral orange-pink", bg: "coral orange-pink", hex: "#FF7F50" },
  { skin: "rust orange-brown", bg: "rust orange-brown", hex: "#B7410E" },
  { skin: "charcoal gray dark", bg: "charcoal gray dark", hex: "#36454F" },
  { skin: "slate gray medium", bg: "slate gray medium", hex: "#708090" },
  { skin: "bone white pale cream", bg: "bone white pale cream", hex: "#F9F6EE" },
  { skin: "jet black dark", bg: "jet black dark", hex: "#0A0A0A" },
  { skin: "golden yellow bright", bg: "golden yellow bright", hex: "#FFD700" },
  { skin: "mustard yellow earthy", bg: "mustard yellow earthy", hex: "#FFDB58" },
  { skin: "lemon yellow pale", bg: "lemon yellow pale", hex: "#FFF44F" },
  { skin: "chocolate brown dark", bg: "chocolate brown dark", hex: "#7B3F00" },
  { skin: "tan brown light", bg: "tan brown light", hex: "#D2B48C" },
  { skin: "mahogany red-brown deep", bg: "mahogany red-brown deep", hex: "#C04000" },
  { skin: "hot pink bright vibrant", bg: "hot pink bright vibrant", hex: "#FF69B4" },
  { skin: "rose pink soft", bg: "rose pink soft", hex: "#FF007F" },
  { skin: "pastel pink soft baby light", bg: "pastel pink soft baby light", hex: "#FFD1DC" },
  { skin: "pastel blue soft powder light", bg: "pastel blue soft powder light", hex: "#B0E0E6" },
  { skin: "pastel mint green soft light", bg: "pastel mint green soft light", hex: "#BDECB6" },
  { skin: "pastel lavender purple soft light", bg: "pastel lavender purple soft light", hex: "#E6E6FA" },
  { skin: "pastel peach orange soft light", bg: "pastel peach orange soft light", hex: "#FFDAB9" },
  { skin: "pastel lemon yellow soft light", bg: "pastel lemon yellow soft light", hex: "#FFFACD" },
  { skin: "pastel lilac purple soft light", bg: "pastel lilac purple soft light", hex: "#C8A2C8" },
  { skin: "pastel aqua blue-green soft light", bg: "pastel aqua blue-green soft light", hex: "#7FFFD4" },
  { skin: "pastel coral pink-orange soft light", bg: "pastel coral pink-orange soft light", hex: "#F88379" },
  { skin: "pastel sage green soft light", bg: "pastel sage green soft light", hex: "#9DC183" },
  { skin: "pastel periwinkle blue-purple soft light", bg: "pastel periwinkle blue-purple soft light", hex: "#CCCCFF" },
  { skin: "pastel ivory cream soft light", bg: "pastel ivory cream soft light", hex: "#FFFFF0" },
  { skin: "neon pink hot bright glowing electric", bg: "neon pink hot bright glowing electric", hex: "#FF10F0" },
  { skin: "neon green lime bright glowing electric", bg: "neon green lime bright glowing electric", hex: "#39FF14" },
  { skin: "neon blue cyan bright glowing electric", bg: "neon blue cyan bright glowing electric", hex: "#00FFFF" },
  { skin: "neon yellow bright glowing electric", bg: "neon yellow bright glowing electric", hex: "#FFFF00" },
  { skin: "neon orange bright glowing electric", bg: "neon orange bright glowing electric", hex: "#FFA500" },
  { skin: "neon purple bright glowing electric", bg: "neon purple bright glowing electric", hex: "#BC13FE" },
  { skin: "neon magenta bright glowing electric", bg: "neon magenta bright glowing electric", hex: "#FF00FF" },
  { skin: "neon turquoise bright glowing electric", bg: "neon turquoise bright glowing electric", hex: "#40E0D0" },
  { skin: "neon red bright glowing electric", bg: "neon red bright glowing electric", hex: "#FF073A" },
  { skin: "neon chartreuse yellow-green glowing electric", bg: "neon chartreuse yellow-green glowing electric", hex: "#7FFF00" },
  { skin: "neon fuchsia pink-purple glowing electric", bg: "neon fuchsia pink-purple glowing electric", hex: "#FF00FF" },
  { skin: "neon aqua blue-green glowing electric", bg: "neon aqua blue-green glowing electric", hex: "#00FFFF" },
  { skin: "metallic gold shiny gleaming", bg: "metallic gold shiny gleaming", hex: "#FFD700" },
  { skin: "metallic silver shiny gleaming", bg: "metallic silver shiny gleaming", hex: "#C0C0C0" },
  { skin: "metallic bronze copper shiny", bg: "metallic bronze copper shiny", hex: "#CD7F32" },
  { skin: "metallic rose gold pink shiny", bg: "metallic rose gold pink shiny", hex: "#B76E79" },
  { skin: "metallic platinum silver-white shiny", bg: "metallic platinum silver-white shiny", hex: "#E5E4E2" },
  { skin: "metallic copper orange shiny", bg: "metallic copper orange shiny", hex: "#B87333" },
  { skin: "metallic chrome silver mirror shiny", bg: "metallic chrome silver mirror shiny", hex: "#E8E8E8" },
  { skin: "metallic brass yellow shiny", bg: "metallic brass yellow shiny", hex: "#B5A642" },
  { skin: "metallic titanium gray shiny", bg: "metallic titanium gray shiny", hex: "#878681" },
  { skin: "metallic pearl white iridescent shiny", bg: "metallic pearl white iridescent shiny", hex: "#F0EAD6" },
  { skin: "metallic gunmetal dark gray shiny", bg: "metallic gunmetal dark gray shiny", hex: "#2A3439" },
  { skin: "metallic champagne gold-beige shiny", bg: "metallic champagne gold-beige shiny", hex: "#F7E7CE" }
];

// ALL ACCESSORIES (Same as before - keeping it concise for space)
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
  "large round yellow eyes menacing", "small beady eyes glowing red",
  "wide crazy eyes bulging threatening", "squinting menacing evil eyes",
  "sunglasses cool over eyes", "3D glasses red-blue over eyes",
  "steampunk goggles brass over eyes", "cyclops single giant eye scary",
  "heart-shaped glasses over eyes", "ski goggles over eyes",
  "swimming goggles over eyes", "VR headset over eyes",
  "laser eyes glowing red dangerous", "star-shaped sunglasses over eyes",
  "cat-eye glasses over eyes", "jeweled monocle over one eye",
  "cracked monocle over eye", "glowing blue eyes bright intimidating",
  "X-ray specs over eyes"
];

const MOUTH_ITEMS = [
  "huge wide grinning mouth showing many sharp razor fangs terrifying",
  "giant open mouth with rows of jagged dangerous fangs menacing",
  "massive toothy evil grin showing pointed vicious fangs",
  "enormous mouth with multiple rows of sharp deadly fangs",
  "wide crazy sinister smile showing all sharp teeth frightening",
  "evil grinning mouth with prominent threatening fangs visible",
  "creepy menacing smile with sharp jagged teeth",
  "menacing aggressive grin with big dangerous fangs",
  "wicked evil smile showing rows of sharp teeth",
  "fierce intimidating grinning mouth with fangs",
  "vampire fangs protruding from mouth scary",
  "single gold tooth shining in menacing grin",
  "missing front teeth gap in threatening smile",
  "braces on teeth metal visible with evil grin",
  "tongue sticking out with sharp fangs showing"
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
  "angry scowling menacing", "evil grinning maniacally threatening",
  "grumpy frowning intimidating", "crazy laughing wild scary",
  "sneaky smirking sinister", "confused dumb",
  "aggressive menacing dangerous", "proud confident intimidating",
  "surprised shocked wide-eyed", "sleepy tired yawning",
  "excited maniacal", "nervous sweating worried",
  "silly goofy", "cool relaxed chill",
  "mischievous plotting devious threatening"
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt() {
  const colorScheme = getRandomElement(GOBLIN_COLOR_SCHEMES);
  const skinColor = colorScheme.skin;
  const background = colorScheme.bg;
  const hexColor = colorScheme.hex;
  
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
    "children's book art style, storybook character",
    "vector graphic flat design, minimalist shading",

    `${BASE_CHARACTER} with ${skinColor} smooth skin`,
    
    // 🔥🔥🔥 40+ LINES - MAKE IT SCARY/MONSTER!
    "SCARY MONSTER CHARACTER: intimidating menacing appearance",
    "THREATENING PRESENCE: dangerous looking goblin creature",
    "MONSTER FEATURES: sharp aggressive facial features",
    "MENACING LOOK: evil sinister scary character design",
    "DANGEROUS MONSTER: intimidating threatening blob goblin",
    "SCARY CREATURE: menacing dangerous appearance overall",
    "EVIL MONSTER: wicked sinister character vibe",
    "THREATENING GOBLIN: aggressive intimidating posture",
    "sharp pointed ears tilted back menacingly",
    "menacing threatening facial expression overall",
    "dangerous intimidating monster vibes",
    "scary evil creature appearance",
    "aggressive threatening posture stance",
    "menacing sinister character design",
    "intimidating dangerous monster look",
    "evil wicked scary goblin features",
    "threatening menacing blob monster",
    "sharp fangs teeth prominent and visible always",
    "pointed dangerous teeth showing clearly",
    "razor sharp fangs displayed prominently",
    "menacing toothy grin with sharp fangs",
    "evil scary smile showing all teeth",
    "threatening grin with fangs visible always",
    "dangerous mouth full of sharp teeth",
    "intimidating fangs protruding from mouth",
    "sharp clawed hands with pointed claws visible",
    "dangerous looking claws on fingers",
    "menacing talons on hand edges",
    "sharp claw tips showing clearly",
    "pointed claws visible on hands always",
    "wide stance aggressive posture",
    "menacing threatening body language overall",
    "intimidating presence through posture",
    "aggressive stance with arms ready",
    "dangerous looking pose threatening",
    "evil monster character NOT cute NOT friendly",
    "WRONG: adorable cute kawaii style",
    "WRONG: friendly harmless looking",
    "WRONG: innocent baby-like features",
    "WRONG: round soft cuddly appearance only",
    "WRONG: sweet gentle harmless vibe",
    "WRONG: cute pet-like character design",
    "NOT A CUTE MASCOT: scary monster instead",
    "NOT ADORABLE: menacing and threatening instead",
    "NOT FRIENDLY: evil and dangerous instead",
    "NOT HARMLESS: intimidating and scary instead",
    
    // 🔥🔥🔥 ULTRA-ENFORCED BODY SIZE (400x450px)
    "CRITICAL SIZE ENFORCEMENT: ALL CHARACTERS MUST BE IDENTICAL SIZE",
    "MANDATORY: body dimensions are EXACTLY 400 pixels wide by 450 pixels tall",
    "REQUIRED: every single character is 400x450 pixels NO EXCEPTIONS",
    "ABSOLUTE: body size is LOCKED to 400 width 450 height ALWAYS",
    "STRICT: character occupies precisely 400x450 pixel space",
    "ENFORCED: body is standardized to 400px x 450px oval shape",
    "NON-NEGOTIABLE: body measures exactly 400 wide 450 tall",
    "FIXED: character body is 400 pixels horizontal 450 pixels vertical",
    "EXACT BODY DIMENSIONS: slightly oval blob body 400 pixels wide by 450 pixels tall",
    "body measures precisely 400px width by 450px height EXACT",
    "body is gently oval shape 400x450 pixels maintaining proportions EXACT",
    "chubby belly is soft oval exactly 400 wide by 450 tall pixels EXACT",
    "body fills 45% of image height consistently EXACT",
    "oval torso measures 400 pixels wide by 450 pixels tall EXACT ALWAYS",
    "blob body is standard size 400x450px gentle oval ALWAYS CONSISTENT",
    "character width is locked at 400 pixels NEVER VARIES",
    "character height is locked at 450 pixels NEVER VARIES",
    "body proportions are 400:450 ratio STRICTLY MAINTAINED",
    "torso occupies exactly 400x450 pixel bounding box FIXED",
    "character scale is identical across all generations MANDATORY",
    "body size consistency is CRITICAL do not deviate",
    "standardized body dimensions 400 wide 450 tall REQUIRED",
    "uniform character sizing 400x450 pixels ENFORCED",
    "consistent body measurements 400 by 450 pixels ABSOLUTE",
    "all characters share exact same 400x450px body size",
    "body size variation is FORBIDDEN maintain 400x450",
    "character must fit perfectly in 400x450 pixel space",
    "body dimensions are non-variable fixed at 400x450",
    "400 pixel width is the ONLY acceptable width",
    "450 pixel height is the ONLY acceptable height",
    "EXACTLY TWO short stubby legs identical size ALWAYS",
    "each leg measures precisely 60 pixels tall 30 pixels wide EXACT",
    "EXACTLY TWO small rounded arms identical size ALWAYS",
    "each arm measures precisely 70 pixels long 25 pixels thick EXACT",
    "head is round sphere attached to body top",
    "head measures 180 pixels diameter exactly ALWAYS",
    
    "no muscle definition, soft blob body",
    "wide short squat stature, round blob build",

    `${expression} facial expression`,
    "small pointed ears on sides of head",
    `${headItem}`,
    `${eyeItem}`,
    `${mouthItem}`,
    "mouth showing fangs teeth clearly visible always",
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

    // Background (will be replaced by post-processing)
    `${skinColor} background`,
    
    "simple cartoon monster scary goblin blob creature character"
  ].join(", ");

  const negative = [
    "3D render, CGI, realistic, photorealistic, detailed",
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
    
    // Anti-cute
    "cute, adorable, kawaii, sweet, innocent",
    "friendly, harmless, gentle, soft, cuddly only",
    "baby-like, childish, juvenile",
    
    // Anti-size-variation
    "different body sizes, varying proportions",
    "inconsistent dimensions, irregular sizing",
    
    "muscular, athletic, fit, toned",
    "tall, long limbs, stretched, slender",
    "cigar, pipe, smoking, cigarette",
    "floating accessories, misplaced items"
  ].join(", ");

  return { prompt, negative, hexColor };
}

// 🔥🔥🔥 POST-PROCESSING FUNCTION
async function replaceBackgroundColor(imgBuffer: Buffer, targetHex: string): Promise<Buffer> {
  try {
    // Convert hex to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 255, g: 255, b: 255 };
    };

    const targetRgb = hexToRgb(targetHex);

    // Process image with sharp
    const { data, info } = await sharp(imgBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const processedData = Buffer.from(data);

    // Detect character by finding non-edge pixels (simple edge detection)
    // Replace background (edge pixels) with target color
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        
        // Simple edge detection: if pixel is near edge of image, it's likely background
        const isEdgePixel = x < 50 || x > width - 50 || y < 50 || y > height - 50;
        
        if (isEdgePixel) {
          // Replace with target color
          processedData[idx] = targetRgb.r;
          processedData[idx + 1] = targetRgb.g;
          processedData[idx + 2] = targetRgb.b;
          processedData[idx + 3] = 255; // Full opacity
        }
      }
    }

    // Convert back to image
    const processedImage = await sharp(processedData, {
      raw: {
        width,
        height,
        channels
      }
    })
    .png()
    .toBuffer();

    return processedImage;
  } catch (error) {
    console.error("Post-processing error:", error);
    // Return original if post-processing fails
    return imgBuffer;
  }
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

    const { prompt, negative, hexColor } = buildPrompt();
    console.log(`🎨 Generating SCARY MONSTER with color: ${hexColor}...`);
    
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

    // 🔥🔥🔥 POST-PROCESS: Replace background with exact target color!
    console.log("🎨 Post-processing: Replacing background...");
    const processedImgBuf = await replaceBackgroundColor(imgBuf, hexColor);

    const dataUrl = `data:image/png;base64,${processedImgBuf.toString("base64")}`;

    return NextResponse.json({
      generated_image_url: dataUrl,
      success: true
    });

  } catch (e: any) {
    console.error("Route error:", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
