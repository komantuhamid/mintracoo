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
    // STYLE
    "simple flat 2D cartoon illustration",
    "thick black outlines, bold lines",
    "absolutely flat shading, NO gradients, NO depth",
    
    // CHARACTER with CONSISTENT COLOR THEME
    `cute round blob goblin with ${skinColor} colored skin and body`,
    `wearing ${headItem}`,
    `${eyeItem}`,
    `${mouthItem}`,
    `wearing ${clothing}`,
    `${neckItem}`,
    `holding ${handItem}`,
    `${expression} expression`,
    
    // BACKGROUND
    `solid ${background} background`,
    
    // COMPOSITION
    "centered, front view, full body",
    "sticker style, flat emoji design"
  ].join(", ");

  const negative = [
    "3D, realistic, photo, gradient, shadows, depth, multiple characters, text, watermark"
  ].join(", ");

  return { prompt, negative };
}


export async function POST(req: NextRequest) {
  try {
const body = await req.json().catch(() => ({}));
const fid = body?.fid;  // ✅ Get FID instead of pfpUrl

let selectedColorScheme: { skin: string; bg: string } | undefined;

// ✅ If FID provided, use it for consistent personalized colors
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
      imageUrl: dataUrl,
      success: true
    });
  } catch (e: any) {
    console.error("Route error:", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
