export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";
const BASE_CHARACTER = "round blob goblin creature monster";

// 🎨 72 COLOR SCHEMES (MONOCHROMATIC - MATCHING BACKGROUND)
// 🎨 72 COLOR SCHEMES - VARIED SKIN with NEUTRAL BACKGROUNDS
const GOBLIN_COLOR_SCHEMES = [
  { skin: "bright neon lime green glowing", bg: "soft cream beige light" },
  { skin: "dark forest green deep", bg: "soft gray light neutral" },
  { skin: "mint green pastel light", bg: "pale blue light soft" },
  { skin: "olive green earthy", bg: "warm tan light" },
  { skin: "emerald green rich vibrant", bg: "soft white off-white" },
  { skin: "sage green muted soft", bg: "light lavender soft" },
  { skin: "chartreuse yellow-green bright", bg: "pale pink soft light" },
  { skin: "jade green medium", bg: "soft peach light" },
  { skin: "cobalt blue bright electric", bg: "soft cream light" },
  { skin: "navy blue dark deep", bg: "light gray soft" },
  { skin: "cyan blue light bright", bg: "warm beige soft" },
  { skin: "teal turquoise blue-green", bg: "soft yellow pale" },
  { skin: "sky blue pastel light", bg: "soft gray warm" },
  { skin: "royal blue rich vibrant", bg: "light cream soft" },
  { skin: "violet purple bright", bg: "soft beige light" },
  { skin: "deep purple dark rich", bg: "pale gray light" },
  { skin: "lavender purple pastel", bg: "soft white warm" },
  { skin: "magenta purple-pink bright", bg: "light tan soft" },
  { skin: "indigo purple-blue deep", bg: "soft cream warm" },
  { skin: "crimson red bright", bg: "soft gray light" },
  { skin: "dark red maroon deep", bg: "warm beige light" },
  { skin: "orange bright vibrant", bg: "soft cream light" },
  { skin: "coral orange-pink", bg: "light blue soft pale" },
  { skin: "rust orange-brown", bg: "soft gray warm" },
  { skin: "charcoal gray dark", bg: "soft cream light" },
  { skin: "slate gray medium", bg: "pale yellow soft" },
  { skin: "bone white pale cream", bg: "soft gray medium" },
  { skin: "jet black dark", bg: "soft white light" },
  { skin: "golden yellow bright", bg: "soft gray light" },
  { skin: "mustard yellow earthy", bg: "warm beige light" },
  { skin: "lemon yellow pale", bg: "soft white cream" },
  { skin: "chocolate brown dark", bg: "light tan soft" },
  { skin: "tan brown light", bg: "soft gray warm" },
  { skin: "mahogany red-brown deep", bg: "soft cream light" },
  { skin: "hot pink bright vibrant", bg: "light gray soft" },
  { skin: "rose pink soft", bg: "soft beige warm" },
  { skin: "pastel pink soft baby light", bg: "soft white light" },
  { skin: "pastel blue soft powder light", bg: "soft cream warm" },
  { skin: "pastel mint green soft light", bg: "light tan soft" },
  { skin: "pastel lavender purple soft light", bg: "soft gray light" },
  { skin: "pastel peach orange soft light", bg: "soft white warm" },
  { skin: "pastel lemon yellow soft light", bg: "light beige soft" },
  { skin: "pastel lilac purple soft light", bg: "soft gray warm" },
  { skin: "pastel aqua blue-green soft light", bg: "soft cream light" },
  { skin: "pastel coral pink-orange soft light", bg: "pale gray soft" },
  { skin: "pastel sage green soft light", bg: "soft white light" },
  { skin: "pastel periwinkle blue-purple soft light", bg: "warm tan light" },
  { skin: "pastel ivory cream soft light", bg: "soft gray medium" },
  { skin: "neon pink hot bright glowing electric", bg: "dark charcoal gray" },
  { skin: "neon green lime bright glowing electric", bg: "dark navy blue" },
  { skin: "neon blue cyan bright glowing electric", bg: "dark purple deep" },
  { skin: "neon yellow bright glowing electric", bg: "dark gray charcoal" },
  { skin: "neon orange bright glowing electric", bg: "dark brown deep" },
  { skin: "neon purple bright glowing electric", bg: "dark gray medium" },
  { skin: "neon magenta bright glowing electric", bg: "dark blue navy" },
  { skin: "neon turquoise bright glowing electric", bg: "dark charcoal" },
  { skin: "neon red bright glowing electric", bg: "dark gray deep" },
  { skin: "neon chartreuse yellow-green glowing electric", bg: "dark navy" },
  { skin: "neon fuchsia pink-purple glowing electric", bg: "dark charcoal gray" },
  { skin: "neon aqua blue-green glowing electric", bg: "dark gray medium" },
  { skin: "metallic gold shiny gleaming", bg: "dark burgundy red" },
  { skin: "metallic silver shiny gleaming", bg: "dark navy blue" },
  { skin: "metallic bronze copper shiny", bg: "dark forest green" },
  { skin: "metallic rose gold pink shiny", bg: "dark gray charcoal" },
  { skin: "metallic platinum silver-white shiny", bg: "dark purple deep" },
  { skin: "metallic copper orange shiny", bg: "dark teal blue" },
  { skin: "metallic chrome silver mirror shiny", bg: "dark charcoal gray" },
  { skin: "metallic brass yellow shiny", bg: "dark brown rich" },
  { skin: "metallic titanium gray shiny", bg: "dark navy blue" },
  { skin: "metallic pearl white iridescent shiny", bg: "dark gray deep" },
  { skin: "metallic gunmetal dark gray shiny", bg: "dark burgundy red" },
  { skin: "metallic champagne gold-beige shiny", bg: "dark forest green" }
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

// ✅ FIXED: Only ONE EYE_ITEMS declaration
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
  "happy smiling cheerful",
  "angry grumpy mad",
  "excited happy beaming",
  "nervous sweating worried",
  "silly goofy derpy",
  "cool relaxed chill",
  "mischievous plotting devious"
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}


// ✅ USE FID FOR CONSISTENT PERSONALIZED COLORS
function getPersonalizedColor(fid: number): { skin: string; bg: string } {
  // Use FID as a seed to pick a consistent color for this user
  const colorIndex = fid % GOBLIN_COLOR_SCHEMES.length;
  const selectedScheme = GOBLIN_COLOR_SCHEMES[colorIndex];
  
  console.log(`🎨 FID ${fid} → Color Index ${colorIndex} → ${selectedScheme.skin}`);
  return selectedScheme;
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
    "simple flat 2D cartoon illustration, clean vector art style",
    "thick black outlines, bold cartoon lines, simple coloring",
    "absolutely flat shading, NO gradients, NO depth",
    "completely flat illustration, zero dimension, pure 2D",
    "flat solid colors only, no shading variations",
    "children's book art style,  storybook character",
    "vector graphic flat design, minimalist shading",

    `adorable ${BASE_CHARACTER} with ${skinColor} smooth skin`,
    
    // 🔥 BODY SIZE - SLIGHTLY TALLER (400x450px)
    "EXACT BODY DIMENSIONS: slightly oval blob body 400 pixels wide by 450 pixels tall",
    "body measures precisely 400px width by 450px height",
    "body is gently oval shape 400x450 pixels maintaining  proportions",
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
    
    "simple cartoon mascot  blob monster character"
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


export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fid = body?.fid;
    const pfpUrl = body?.pfpUrl;  // ✅ Get PFP image URL
    
    let selectedColorScheme: { skin: string; bg: string } | undefined;
    
    // Use FID for consistent colors
    if (fid && typeof fid === 'number') {
      selectedColorScheme = getPersonalizedColor(fid);
      console.log("✅ Using FID-based color:", selectedColorScheme.skin);
    }

    if (!HF_TOKEN) {
      return NextResponse.json(
        { error: "Missing HUGGINGFACE_API_TOKEN" },
        { status: 500 }
      );
    }

    const { prompt, negative } = buildPrompt(selectedColorScheme);
    console.log("🎨 Generating Goblin NFT...");

    const hf = new HfInference(HF_TOKEN);
    let output: any = null;
    let lastErr: any = null;

    // ✅ NEW: If PFP URL provided, use image-to-image
    const parameters: any = {
      width: 1024,
      height: 1024,
      num_inference_steps: 35,
      guidance_scale: 7.5,
      negative_prompt: negative,
    };

    // If PFP provided, fetch it and use as init_image for img2img
    if (pfpUrl) {
      try {
        console.log("🖼️ Fetching PFP for image-to-image:", pfpUrl);
        const pfpResponse = await fetch(pfpUrl);
        if (pfpResponse.ok) {
          const pfpBlob = await pfpResponse.blob();
          parameters.init_image = pfpBlob;  // Use PFP as base image
          parameters.strength = 0.75;  // How much to transform (0.5-0.9)
          console.log("✅ Using PFP as base for transformation");
        }
      } catch (e) {
        console.log("⚠️ Could not fetch PFP, using text-to-image instead");
      }
    }

    for (let i = 0; i < 3; i++) {
      try {
        output = await (hf.textToImage as any)({
          inputs: prompt,
          model: MODEL_ID,
          provider: PROVIDER,
          parameters,
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
      imageUrl: dataUrl,
      success: true
    });
  } catch (e: any) {
    console.error("Route error:", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
