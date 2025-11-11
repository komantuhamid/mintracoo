export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

const BASE_CHARACTER = "cute round blob goblin creature monster";

// 🎨 72 COLOR SCHEMES - ALL KEPT
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

// ALL ITEMS KEPT (190 total!)
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
  "sunglasses cool over eyes", "retro glasses over eyes",
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
    "ULTRA FLAT 2D STICKER STYLE PNG EMOJI NFT",
    "thick bold black cartoon outlines around character edges",
    "flat vector art illustration completely 2D zero depth",
    "solid flat colors only NO shading NO gradients ANYWHERE",
    "cel-shaded flat cartoon style like animated sticker",
    "NO 3D rendering NO rounded shading NO depth shading",
    "simple flat coloring like children's coloring book",
    "clean flat illustration vector graphic design",
    "sticker emoji style PNG cutout flat design",
    
    // 🔥 ONLY BLACK OUTLINES (NO WHITE!)
    "ONLY BLACK OUTLINES around character",
    "black ink outlines cartoon style no white borders",
    "character has ONLY black outline edges",
    "NO white border NO white outline NO white edge",
    "black cartoon lines around character only",

    `adorable ${BASE_CHARACTER} with ${skinColor} flat uniform color`,
    
    // 🔥 EXTREME BODY CONSISTENCY
    "EXACT BODY TEMPLATE: perfectly circular round blob torso",
    "body is perfect sphere shape width equals height 1:1",
    "soft round chubby belly smooth spherical body",
    "body MUST be perfect circle NO variation",
    "dumpy roly-poly spherical pudgy blob",
    "wide short squat spherical blob build",

    // 🔥🔥🔥 NUCLEAR EAR CONSISTENCY (NEW!)
    "MANDATORY: EXACTLY TWO ears perfectly identical twins",
    "BOTH ears MUST be EXACTLY same size NO EXCEPTION",
    "BOTH ears MUST be EXACTLY same shape NO EXCEPTION",
    "BOTH ears MUST be small pointed triangles identical",
    "ears are PERFECT MIRROR COPIES of each other",
    "left ear IDENTICAL to right ear absolutely",
    "ears positioned at EXACT same height on sides of head",
    "BOTH ears same distance from top of head perfectly symmetrical",
    "ears are small pointed elf-like triangles matching perfectly",
    "BOTH ears pointing upward at same angle identical",
    "NO ear variation allowed ZERO DIFFERENCE between ears",
    "ears MUST match perfectly like mirror reflection",
    "small pointed ears identical twins perfectly symmetrical",

    // 🔥 NUCLEAR LEG CONSISTENCY
    "MANDATORY: EXACTLY TWO legs perfectly identical twins",
    "BOTH legs MUST be EXACTLY same length NO EXCEPTION",
    "BOTH legs MUST be EXACTLY same thickness NO EXCEPTION",
    "BOTH legs MUST be EXACTLY same shape NO EXCEPTION",
    "legs are PERFECT MIRROR COPIES of each other",
    "left leg IDENTICAL to right leg absolutely",
    "legs EXACTLY 20% of body height very short stubby",
    "legs are thick rounded stumps cylindrical identical",
    "BOTH legs parallel standing straight down together",
    "BOTH legs same distance from center perfectly symmetrical",
    "NO leg variation allowed ZERO DIFFERENCE between legs",
    "legs MUST match perfectly like mirror reflection",
    "stubby short legs minimal length identical twins",

    // 🔥 NUCLEAR ARM CONSISTENCY
    "MANDATORY: EXACTLY TWO arms perfectly identical twins",
    "BOTH arms MUST be EXACTLY same length NO EXCEPTION",
    "BOTH arms MUST be EXACTLY same thickness NO EXCEPTION",
    "BOTH arms MUST be EXACTLY same shape NO EXCEPTION",
    "arms are PERFECT MIRROR COPIES of each other",
    "left arm IDENTICAL to right arm absolutely",
    "arms EXACTLY 25% of body width very short stubby",
    "arms are rounded noodle tubes soft identical",
    "BOTH arms mirror each other perfectly symmetrical",
    "BOTH arms same distance from center perfectly balanced",
    "NO arm variation allowed ZERO DIFFERENCE between arms",
    "arms MUST match perfectly like mirror reflection",
    "short stubby arms minimal length identical twins",

    `${expression} facial expression`,
    `${headItem}`,
    `${eyeItem}`,
    `${mouthItem}`,
    `${clothing}`,
    `${neckItem}`,
    `${handItem}`,

    "facing directly forward front view centered",
    "standing upright full body visible",
    "looking straight at viewer",

    // 🔥 SAME COLOR BACKGROUND
    `entire background is ${skinColor}`,
    `flat solid ${background} background uniform color`,
    `${skinColor} fills entire background completely`,
    "background is SAME EXACT color as character skin",
    "perfect monochromatic single-color scheme",
    "character blends perfectly into background color",
    "background completely flat solid NO variation",
    "background and character are IDENTICAL COLOR",
    "monochrome color palette same tone everywhere",

    "flat 2D sticker emoji PNG NFT character"
  ].join(", ");

  const negative = [
    // 🔥 NUCLEAR ANTI-3D
    "3D render, CGI, realistic, photorealistic, Unreal Engine",
    "3D shading, 3D lighting, 3D depth, 3D rendering",
    "rounded shading, spherical shading, volumetric shading",
    "soft shading, smooth shading, gradient shading",
    "shading on body, belly shading, torso shading",
    "light and shadow, lighting effects, dramatic lighting",
    "shadows anywhere, shadow on character, shadow under feet",
    "drop shadow, cast shadow, ground shadow, floor shadow",
    "depth of field, blur, bokeh, atmospheric haze",
    "ambient occlusion, contact shadows, soft shadows",
    "rim lighting, edge lighting, backlighting",
    "highlights, specular highlights, glossy highlights",
    "gradients on body, color gradients, tone gradients",
    "shading at edges, darkening at bottom, vignette",
    "3D modeling, sculpted, rendered, raytraced",
    "depth, dimension, volume, perspective",
    "cinematic lighting, studio lighting, professional lighting",

    // 🔥 ANTI-WHITE BORDER/OUTLINE
    "white border, white outline, white edge around character",
    "white glow, white halo, white rim around character",
    "white stroke, white border line, white outer edge",
    "white frame, white boundary, white perimeter",
    "white contour, white silhouette edge, white outer line",
    "glowing white edge, bright white border, white highlight edge",
    "white separator, white divider line around character",
    "white stroke outline, white cartoon outline",
    "sticker border, white sticker edge, white cutout border",
    "white background leak, white edge bleed",
    "light outline, bright outline, pale outline",
    "double outline, multiple outlines, extra outlines",

    // 🔥 ANTI-DIFFERENT BACKGROUND
    "gradient background, shaded background, depth background",
    "background gradient, background shading, background variation",
    "different background color, mismatched colors",
    "two-tone background, multi-color background",
    "background different from character color",
    "contrasting background, complementary colors",
    "background color mismatch, wrong background",

    // 🔥🔥🔥 NUCLEAR ANTI-ASYMMETRY
    "asymmetrical legs, uneven legs, different leg lengths",
    "one leg longer, one leg shorter, mismatched legs",
    "legs different sizes, legs different shapes, unequal legs",
    "asymmetrical arms, uneven arms, different arm lengths",
    "one arm longer, one arm shorter, mismatched arms",
    "arms different sizes, arms different shapes, unequal arms",
    "lopsided limbs, crooked limbs, bent limbs",
    "varying limb thickness, inconsistent limb width",
    "limbs at different angles, tilted limbs",
    "unbalanced proportions, irregular limbs",
    "deformed limbs, malformed limbs, distorted limbs",
    "three legs, four legs, one leg, no legs",
    "three arms, four arms, one arm, no arms",
    "extra limbs, missing limbs, wrong number of limbs",

    // 🔥🔥🔥 NUCLEAR ANTI-EAR ASYMMETRY (NEW!)
    "asymmetrical ears, uneven ears, different ear sizes",
    "one ear bigger, one ear smaller, mismatched ears",
    "ears different shapes, one ear round one ear pointed",
    "ears at different heights, tilted ears, crooked ears",
    "floppy ears, droopy ears, bent ears, folded ears",
    "round ears, circular ears, oval ears",
    "long ears, tall ears, big ears, large ears",
    "rabbit ears, bunny ears, elf ears long",
    "human ears, realistic ears, detailed ears",
    "three ears, four ears, one ear, no ears",
    "extra ears, missing ears, wrong number of ears",
    "ears on top of head, ears on face",

    // 🔥 CONSISTENCY NEGATIVES
    "different body proportions, varying sizes",
    "long legs, tall legs, stretched legs, thin legs",
    "long arms, stretched arms, thin arms",
    "human proportions, realistic anatomy",
    "muscular, athletic, fit, toned, defined muscles",

    // 🔥 QUALITY NEGATIVES
    "blurry, low quality, messy, sketchy, unfinished",
    "detailed texture, fur detail, skin texture, pores",
    "painted, brush strokes, oil painting, watercolor",
    "text, watermark, logo, signature, frame",
    "multiple characters, cropped, cut off",
    "side view, profile, angled, back view",
    "smoking, cigar, cigarette, tobacco"
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
    console.log("🎨 Generating PERFECTLY SYMMETRICAL NFT (WITH EARS!)...");
    
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
            num_inference_steps: 40,
            guidance_scale: 15.0,
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
