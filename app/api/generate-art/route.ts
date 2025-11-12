export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

const BASE_CHARACTER = "cute round blob goblin creature monster";

// 🎨 72 COLOR SCHEMES
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

// 🎨 ALL ITEMS (190 total)
const HEAD_ITEMS = [
  "small leather cap on top of head", "tiny metal helmet on top of head", "cloth hood covering head", "small bandana on head",
  "bone helmet on top of head", "small iron crown on top of head", "wizard hat on top of head", "fur hat on head",
  "small horned helmet on head", "skull cap on top of head", "straw hat on head", "pointed hood covering head",
  "war paint marks on face", "animal pelt on head", "bald head no hat", "viking helmet with horns on head",
  "cowboy hat on top of head", "pirate tricorn hat on head", "chef hat tall white on head", "baseball cap worn backwards on head",
  "bucket hat on top of head", "beanie knit cap on head", "beret tilted on head", "sombrero on top of head",
  "top hat tall on head", "fedora hat on head", "samurai kabuto helmet on head", "ninja hood covering head",
  "santa hat red on head", "party hat cone on head"
];

const EYE_ITEMS = [
  "small eye patch over one eye", "tiny goggles over eyes", "small monocle over one eye", "round glasses over eyes",
  "bandage covering one eye", "tiny aviator goggles over eyes", "large round yellow eyes", "small beady eyes glowing",
  "wide crazy eyes bulging", "squinting menacing eyes", "sunglasses cool over eyes", "3D glasses red-blue over eyes",
  "steampunk goggles brass over eyes", "cyclops single giant eye", "heart-shaped glasses over eyes", "ski goggles over eyes",
  "swimming goggles over eyes", "VR headset over eyes", "laser eyes glowing red", "star-shaped sunglasses over eyes",
  "cat-eye glasses over eyes", "jeweled monocle over one eye", "cracked monocle over eye", "glowing blue eyes bright",
  "X-ray specs over eyes"
];

const MOUTH_ITEMS = [
  "huge wide grinning mouth showing many sharp fangs", "giant open mouth with rows of jagged fangs",
  "massive toothy grin showing pointed fangs", "enormous mouth with multiple rows of sharp fangs",
  "wide crazy smile showing all sharp teeth", "evil grinning mouth with prominent fangs visible",
  "creepy smile with sharp jagged teeth", "menacing grin with big fangs", "wicked smile showing rows of teeth",
  "fierce grinning mouth with fangs", "vampire fangs protruding from mouth", "single gold tooth shining in grin",
  "missing front teeth gap in smile", "braces on teeth metal visible", "tongue sticking out cheeky"
];

const CLOTHING = [
  "small leather vest worn on torso", "tiny torn rags covering body", "simple cloth tunic on body", "small fur vest on torso",
  "simple leather jerkin on body", "tiny torn robes on body", "small patchwork leather on body", "tiny animal hide covering torso",
  "simple torn shirt on body", "small iron armor on torso", "tiny torn cloak over shoulders", "simple leather coat on body",
  "small pirate vest on torso", "tiny sailor vest on body", "bare chest showing chubby belly", "hawaiian shirt floral on body",
  "tuxedo jacket fancy on torso", "hoodie with hood down on body", "tank top sleeveless on torso", "sweater knitted on body",
  "denim jacket on torso", "bomber jacket on body", "tracksuit jacket on torso", "polo shirt collared on body",
  "football jersey on torso", "basketball jersey on body", "chef coat white on torso", "lab coat white on body",
  "ninja suit black on torso", "samurai armor on body", "superhero cape on shoulders", "wizard robe long on body",
  "monk robe brown on body", "kimono traditional on body", "poncho over shoulders"
];

const NECK_ITEMS = [
  "small bone necklace around neck", "tiny iron collar around neck", "small tooth necklace on neck", "simple leather cord around neck",
  "tiny gold chain on neck", "small bead necklace around neck", "tiny medallion hanging on neck", "small skull pendant on neck",
  "simple rope around neck", "bare neck no necklace", "thick gold chain heavy on neck", "diamond necklace sparkling on neck",
  "pearl necklace elegant around neck", "dog tag chain military on neck", "crucifix necklace on neck", "locket heart-shaped on neck",
  "crystal pendant glowing on neck", "amulet mystical on neck", "coin necklace pirate on neck", "feather necklace tribal on neck",
  "seashell necklace beach on neck", "dog collar spiked around neck", "bow tie around neck", "necktie striped around neck",
  "scarf wrapped around neck", "bandana around neck", "silver chain thin on neck", "rope necklace thick around neck",
  "gemstone necklace colorful on neck", "choker tight around neck"
];

const HAND_ITEMS = [
  "holding small rusty dagger in hand", "gripping tiny wooden club in hand", "holding small coin bag in hand", "holding tiny wooden shield in hand",
  "holding small torch in hand", "gripping tiny battle axe in hand", "holding small shortsword in hand", "gripping tiny iron mace in hand",
  "holding small wooden spear in hand", "holding tiny bow in hand", "holding small loot sack in hand", "holding tiny lantern in hand",
  "holding small skull cup in hand", "holding tiny potion vial in hand", "gripping tiny pickaxe in hand", "holding small meat leg in hand",
  "holding small keys in hand", "holding small bottle in hand", "gripping tiny hammer in hand", "both hands clenched in small fists",
  "holding smartphone in hand", "gripping game controller in hands", "holding coffee cup in hand", "gripping microphone in hand",
  "holding pizza slice in hand", "gripping magic wand in hand", "holding book open in hand", "gripping telescope in hand",
  "holding magnifying glass in hand", "gripping fishing rod in hand", "holding basketball in hands", "gripping baseball bat in hand",
  "holding trophy golden in hand", "gripping drumsticks in hands", "holding guitar small in hand", "gripping paintbrush in hand",
  "holding camera in hand", "gripping sword katana in hand", "holding gem crystal in hand", "gripping staff wooden in hand"
];

const EXPRESSIONS = [
  "angry scowling", "evil grinning maniacally", "grumpy frowning", "crazy laughing wild",
  "sneaky smirking", "confused dumb", "aggressive menacing", "proud confident",
  "surprised shocked wide-eyed", "sleepy tired yawning", "excited happy beaming", "nervous sweating worried",
  "silly goofy derpy", "cool relaxed chill", "mischievous plotting devious"
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
    // 🔥🔥🔥 ULTRA-AGGRESSIVE PEN-DRAWN STYLE!
    "pen and ink illustration drawn with black ink pen on paper",
    "hand-drawn cartoon comic book style thick pen lines",
    "bold black ink outlines crisp clean pen strokes",
    "manga anime comic art style inked with pen",
    "tattoo flash art style thick black linework",
    "sticker design bold outlines clean flat colors",
    "cartoon network animation style thick black borders",
    "cel shaded flat colors no gradients zero depth",
    "simple flat 2D vector art clean graphic design",
    "thick marker lines bold pen drawn illustration",
    "comic strip newspaper cartoon style black ink pen",
    "graffiti sticker art bold outlines flat coloring",
    "vinyl sticker design thick black contours solid fills",
    "logo mascot character simple shapes bold lines",
    "chibi anime style cute proportions thick outlines",
    
    // 🔥 ULTRA-FLAT COLOR ENFORCEMENT
    "absolutely flat solid colors NO SHADING WHATSOEVER",
    "zero gradient zero depth completely flat 2D",
    "flat cel animation coloring solid color fills only",
    "NO shadows NO lighting NO 3D effects NO depth",
    "flat as paper completely two-dimensional artwork",
    "solid color blocks no color variation flat tones",
    "simple coloring book style flat uniform colors",
    
    `adorable ${BASE_CHARACTER} with ${skinColor} smooth flat colored skin`,
    
    // 🔥 PIXEL-PERFECT BODY SPECS
    "character body spherical round blob 400 pixels diameter",
    "perfect circle body 400px width 400px height exactly",
    "chubby round belly circular 400 pixel sphere precisely",
    
    // 🔥 PIXEL-PERFECT EAR SPECS
    "EXACTLY TWO small pointed ears identical twins",
    "each ear measures precisely 45 pixels tall 28 pixels wide",
    "left ear 45px height 28px width right ear 45px height 28px width",
    "both ears small pointed triangles 45 by 28 pixels EXACT",
    "ears positioned symmetrically on head sides perfectly matched",
    "NO variation in ear size ZERO difference between ears",
    
    // 🔥 PIXEL-PERFECT LEG SPECS
    "EXACTLY TWO short stubby legs identical twins",
    "each leg measures precisely 70 pixels tall 35 pixels wide",
    "left leg 70px height 35px width right leg 70px height 35px width",
    "both legs stubby stumps 70 by 35 pixels EXACT",
    "legs positioned symmetrically under body perfectly parallel",
    "NO variation in leg size ZERO difference between legs",
    
    // 🔥 PIXEL-PERFECT ARM SPECS
    "EXACTLY TWO small rounded arms identical twins",
    "each arm measures precisely 85 pixels long 30 pixels thick",
    "left arm 85px length 30px width right arm 85px length 30px width",
    "both arms rounded noodle tubes 85 by 30 pixels EXACT",
    "arms positioned symmetrically on body sides perfectly balanced",
    "NO variation in arm size ZERO difference between arms",

    `${expression} facial expression clear readable`,
    `${headItem} drawn with black pen outlines`,
    `${eyeItem} inked with bold lines`,
    `${mouthItem} teeth fangs clearly visible defined`,
    `${clothing} drawn with pen lines`,
    `${neckItem} inked cleanly`,
    `${handItem} held properly in hands`,

    "all accessories in correct anatomical positions",
    "facing directly forward centered perfect symmetry",
    "standing upright full body visible centered composition",
    "front view straight ahead symmetrical pose",

    // 🔥🔥🔥 NUCLEAR BACKGROUND COLOR MATCHING
    `entire background EXACTLY ${skinColor} NO EXCEPTIONS`,
    `background color is PRECISELY ${background} MATCHING CHARACTER`,
    `fill entire backdrop with ${skinColor} uniformly`,
    `background is IDENTICAL COLOR to character skin perfectly`,
    "character body color EQUALS background color EXACTLY",
    "monochromatic single-color scheme one color only",
    "character blends seamlessly into background same exact color",
    "ZERO color difference between character and background",
    "background same hue same tone same brightness as character",
    "perfect color match body to background flawless blend",
    
    // 🔥 ULTRA-THICK BLACK PEN OUTLINES
    "thick bold black ink pen outlines 4 pixels wide",
    "every edge has strong black border crisp defined",
    "clean sharp black linework professional inking",
    "bold cartoon outlines thick marker pen strokes",
    "strong graphic black borders around all shapes",
    "no thin lines all outlines are thick and bold",
    
    "simple cute cartoon mascot character design",
    "clean professional illustration finished artwork"
  ].join(", ");

  const negative = [
    // 🔥 ANTI-3D ANTI-REALISTIC
    "3D render CGI realistic photorealistic photograph",
    "realistic lighting dramatic shadows depth of field",
    "detailed texture complex shading gradients",
    "soft shading ambient occlusion volumetric lighting",
    "ground shadow cast shadow drop shadow beneath character",
    "3D modeling ray tracing subsurface scattering",
    "airbrushed smooth gradients soft edges blurred",
    "painterly brush strokes watercolor oil painting",
    "sketchy rough unfinished messy loose drawing",
    
    // 🔥🔥 ULTRA-ANTI-SHADING
    "shading gradient lighting shadows depth 3D effects",
    "color gradient radial gradient vignette darkening",
    "soft light hard light rim lighting backlighting",
    "atmospheric perspective depth blur bokeh",
    "dimensional form rendering sphere shading rounded shading",
    "highlight lowlight shadow contrast lighting effects",
    "cel shading with gradients anime shading gradient fills",
    
    // 🔥 ANTI-DETAIL
    "highly detailed intricate complex ornate elaborate",
    "fine details small details texture detail fur strands",
    "realistic skin pores wrinkles imperfections",
    "detailed background scenery environment landscape",
    
    // 🔥 ANTI-DIFFERENT-BACKGROUND
    "gradient background textured background patterned background",
    "background different color than character mismatched colors",
    "background lighter darker brighter duller than character",
    "contrasting background complementary color scheme",
    "two-tone colors multi-color palette color variation",
    "beige cream tan neutral white gray brown background",
    "background wrong color incorrect color different shade",
    
    // 🔥 ANTI-ASYMMETRY
    "asymmetrical ears uneven ears different ear sizes",
    "one ear bigger smaller longer shorter mismatched ears",
    "asymmetrical legs uneven legs different leg lengths",
    "one leg bigger smaller longer shorter mismatched legs",
    "asymmetrical arms uneven arms different arm lengths",
    "one arm bigger smaller longer shorter mismatched arms",
    "crooked tilted bent twisted limbs lopsided proportions",
    "three legs four legs one leg no legs",
    "three arms four arms one arm no arms",
    "three ears four ears one ear no ears",
    
    // 🔥 ANTI-BAD-QUALITY
    "blurry low quality bad quality worst quality",
    "jpeg artifacts compression noise pixelated grainy",
    "deformed distorted mutated malformed ugly",
    "extra limbs missing limbs fused limbs",
    "text watermark logo signature artist name",
    "frame border multiple views collage split image",
    "cropped cut off incomplete partial body",
    "side view profile angled rotated back view",
    "human proportions realistic anatomy tall slender",
    "muscular athletic defined abs toned fit",
    "smoking cigarette cigar pipe tobacco"
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
    console.log("🎨 Generating PEN-DRAWN PERFECT NFT...");
    
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
            num_inference_steps: 45,
            guidance_scale: 10.0,
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
