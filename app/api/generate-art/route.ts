export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// 🧌 BASE CHARACTER
const BASE_CHARACTER = "fantasy goblin creature";

// 🧌 Goblin skin colors (15 options)
const SKIN_COLORS = [
  "bright green",
  "dark forest green",
  "lime green",
  "olive green",
  "mossy green",
  "yellow-green",
  "gray-green",
  "brown-green",
  "orange",
  "red",
  "purple",
  "blue-gray",
  "muddy gray",
  "earthy brown",
  "pale sickly green"
];

// 🧌 Skin textures (12 types)
const SKIN_TEXTURES = [
  "with rough bumpy warty skin texture",
  "with wrinkled old leathery skin",
  "with smooth matte skin",
  "with scaly lizard-like skin",
  "with mottled blotchy patchy skin",
  "with scarred battle-damaged skin",
  "with spotted freckled skin texture",
  "with cracked dry crusty skin",
  "with hairy fuzzy patches",
  "with weathered aged rough skin",
  "with slimy oily sheen skin",
  "with pockmarked crater skin"
];

// 👒 Head items (28 options)
const HEAD_ITEMS = [
  "wearing worn leather cap",
  "wearing rusty metal helmet dented",
  "wearing tattered cloth hood",
  "wearing dirty bandana headband",
  "wearing bone helmet primitive",
  "wearing iron crown rusted",
  "wearing bucket on head makeshift",
  "wearing feather headdress tribal",
  "wearing torn wizard hat pointy",
  "wearing fur hat barbaric",
  "wearing chain mail coif",
  "wearing wooden mask carved",
  "wearing mushroom cap hat",
  "wearing horned helmet viking",
  "wearing goggles leather straps",
  "wearing skull cap bone",
  "wearing bronze circlet ancient",
  "wearing straw hat farmer",
  "wearing jester hat with bells",
  "wearing hood with pointed ears",
  "wearing antler crown",
  "wearing tribal war paint markings",
  "wearing scrap metal helmet patchwork",
  "wearing animal pelt hood",
  "wearing leaf crown natural",
  "wearing cracked pottery bowl helmet",
  "wearing bandage wraps head injured",
  "bald goblin head no hat"
];

// 👀 Eye items (16 options)
const EYE_ITEMS = [
  "wearing leather eye patch scarred",
  "wearing broken cracked goggles",
  "wearing rusty metal monocle",
  "wearing dirty round spectacles",
  "wearing bone frame glasses",
  "wearing scrap goggles steampunk",
  "wearing bandage over one eye bloody",
  "wearing tribal face paint around eyes",
  "wearing iron eye guard visor",
  "wearing clockwork mechanical glass eye",
  "wearing wooden tribal mask covering eyes",
  "wearing aviator goggles cracked lens",
  "wearing blindfold torn rag",
  "wearing crystal monocle magical",
  "wearing skull mask over face",
  "large yellow goblin eyes natural no eyewear"
];

// 👄 Mouth items (14 options)
const MOUTH_ITEMS = [
  "smoking old wooden pipe tobacco",
  "holding dead rat in teeth",
  "smoking cigar stub dirty",
  "chewing on bone gnawing",
  "holding dagger blade between teeth",
  "smoking clay pipe",
  "chewing leather strap",
  "holding gold coin in mouth",
  "biting rope thick twine",
  "smoking mushroom pipe",
  "holding key in teeth rusty",
  "chewing tobacco wad bulging cheek",
  "holding cork bottle stopper",
  "grinning showing sharp jagged fangs"
];

// 👕 Clothing (28 options)
const CLOTHING = [
  "wearing tattered leather vest armor worn",
  "wearing dirty brown rags torn cloth",
  "wearing patched tunic medieval peasant",
  "wearing rusty chain mail armor",
  "wearing fur vest primitive barbaric",
  "wearing studded leather jerkin",
  "wearing torn wizard robes tattered",
  "wearing bronze scale mail armor",
  "wearing burlap sack tunic rough",
  "wearing patchwork scrap leather",
  "wearing animal hide vest tribal",
  "wearing torn shirt cloth",
  "wearing dented iron plate armor",
  "wearing hooded cloak torn brown",
  "wearing mercenary leather coat",
  "wearing pirate vest buckles",
  "wearing prisoner rags chains",
  "wearing blacksmith leather apron",
  "wearing stolen noble doublet fancy",
  "wearing monk robes brown simple",
  "wearing bandit leather straps",
  "wearing scavenger armor mismatched",
  "wearing bone armor ribs primitive",
  "wearing damaged knight armor stolen",
  "wearing sailor vest nautical",
  "wearing alchemist robes stained",
  "wearing simple peasant tunic",
  "bare chest muscular scarred no shirt"
];

// ⛓️ Neck items (14 options)
const NECK_ITEMS = [
  "wearing bone skull necklace trophy",
  "wearing rusty iron collar slave",
  "wearing tooth necklace sharp fangs",
  "wearing leather cord necklace",
  "wearing stolen gold chain loot",
  "wearing tribal bead necklace colorful",
  "wearing rope around neck noose",
  "wearing bronze medallion tarnished",
  "wearing fur collar warm",
  "wearing spiked iron collar punk",
  "wearing skull charm pendant",
  "wearing glowing amulet magical",
  "wearing key ring necklace jangling",
  "bare neck no accessory"
];

// 🗡️ Hand items (32 options)
const HAND_ITEMS = [
  "holding rusty curved dagger threatening",
  "holding wooden club with nails spiked",
  "holding bulging leather coin bag gold",
  "holding cracked wooden shield small",
  "holding primitive crossbow loaded",
  "holding burning torch flame flickering",
  "holding chipped battle axe blade",
  "holding rusty shortsword bent blade",
  "holding heavy iron mace crude",
  "holding wooden spear pointed shaft",
  "holding bow with arrow ready aimed",
  "holding sack of loot stolen goods",
  "holding oil lantern glowing dim",
  "holding skull as drinking cup bone",
  "holding bubbling potion vial glass",
  "holding round bomb black powder",
  "holding chain weapon with hook",
  "holding mining pickaxe tool",
  "holding coiled rope thick hemp",
  "holding cooked meat leg eating",
  "holding stolen chicken live bird",
  "holding caught fish dead",
  "holding large mushroom magical",
  "holding small treasure chest wooden",
  "holding key ring many keys",
  "holding lockpick tools thief",
  "holding parchment map scroll old",
  "holding bottle of rum liquor",
  "holding tankard ale beer mug",
  "holding wooden wand carved magical",
  "holding throwing knife blade sharp",
  "making threatening clenched fist"
];

// 🎨 Backgrounds (12 options)
const BACKGROUNDS = [
  "dark dungeon stone wall background",
  "murky swamp green foggy atmosphere",
  "warm tavern wooden interior",
  "misty dark forest trees background",
  "rocky cave brown stone",
  "gloomy castle gray stone wall",
  "foggy graveyard eerie mood",
  "torchlit corridor orange glow",
  "mossy ruins ancient crumbling",
  "dark alley cobblestone street",
  "underground cavern shadowy",
  "stormy gray sky clouds"
];

// 😠 Expressions (12 options)
const EXPRESSIONS = [
  "angry scowling fierce expression threatening",
  "evil grinning sinister wicked smile menacing",
  "grumpy frowning annoyed irritated look",
  "cackling laughing maniacal crazy grin",
  "sneaky scheming plotting mischievous smirk",
  "confused puzzled stupid dumb expression",
  "aggressive snarling teeth bared angry",
  "greedy hungry drooling wanting",
  "surprised shocked wide-eyed startled",
  "tired exhausted weary worn out",
  "proud confident smug arrogant",
  "battle-hardened tough veteran warrior"
];

function getRandomElement(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt() {
  const skinColor = getRandomElement(SKIN_COLORS);
  const skinTexture = getRandomElement(SKIN_TEXTURES);
  const headItem = getRandomElement(HEAD_ITEMS);
  const eyeItem = getRandomElement(EYE_ITEMS);
  const mouthItem = getRandomElement(MOUTH_ITEMS);
  const clothing = getRandomElement(CLOTHING);
  const neckItem = getRandomElement(NECK_ITEMS);
  const handItem = getRandomElement(HAND_ITEMS);
  const background = getRandomElement(BACKGROUNDS);
  const expression = getRandomElement(EXPRESSIONS);
  
  const prompt = [
    "flat 2D illustration, hand-painted digital art style, matte painting",
    "traditional fantasy artwork, painterly illustration, visible brush strokes texture",
    `detailed ${BASE_CHARACTER} ${skinColor} ${skinTexture}`,
    `${expression}, large pointed ears, crooked sharp nose`,
    "small hunched creature, thin wiry arms muscular",
    `${headItem}`,
    `${eyeItem}`,
    `${mouthItem}`,
    `${clothing}`,
    `${neckItem}`,
    `${handItem}`,
    "standing pose centered, full body visible front view",
    "flat illustration style, traditional painted artwork aesthetic",
    "textured matte finish, hand-painted look, artistic brush work visible",
    "dramatic moody lighting with painted shadows, atmospheric depth",
    `${background} painted backdrop`,
    "Dungeons Dragons art style, Warhammer fantasy painting, storybook illustration",
    "traditional fantasy book cover art, flat illustrated style, painterly technique"
  ].join(", ");

  const negative = [
    "3D render, CGI, smooth 3D, Pixar, Disney style, glossy plastic look",
    "polished smooth rendering, clean CGI, computer generated 3D model",
    "photorealistic, photograph, realistic photo, hyperrealistic render",
    "anime, manga, kawaii, cute, adorable, chibi, cartoon baby style",
    "blurry, low quality, amateur, sketchy draft, messy unfinished",
    "text, watermark, logo, signature, caption, words, letters, frame border",
    "multiple characters, crowd scene, cropped incomplete, floating disconnected",
    "modern clothing, contemporary, t-shirt, jeans, sneakers, modern items",
    "bright colorful rainbow, happy cheerful, cute friendly, pastel soft",
    "smooth gradient shading, airbrushed, vector art clean, digital polish"
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
    console.log("🧌 Generating FLAT 2D PAINTED GOBLIN...");
    
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
            guidance_scale: 7.5,
            negative_prompt: negative,
          },
        });
        break;
      } catch (e: any) {
        lastErr = e;
        if (i < 2) {
          await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        }
      }
    }

    if (!output) {
      const msg = lastErr?.message || "Inference error";
      const status = lastErr?.response?.status || 502;
      return NextResponse.json({ error: msg }, { status });
    }

    // Normalize output
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
