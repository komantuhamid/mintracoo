export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const MODEL_ID = "black-forest-labs/FLUX.1-dev";
const PROVIDER = "replicate";
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || "";

// 🧌 BASE CHARACTER - GOBLIN!
const BASE_CHARACTER = "fantasy goblin character";

// 🧌 Goblin skin colors (15 options)
const SKIN_COLORS = [
  "bright green",
  "dark green",
  "lime green",
  "olive green",
  "mossy green",
  "yellow-green",
  "gray-green",
  "brown-green",
  "orange goblin",
  "red goblin",
  "purple goblin",
  "blue goblin",
  "gray goblin",
  "brown goblin",
  "pale green"
];

// 🧌 Goblin skin textures (12 types)
const SKIN_TEXTURES = [
  "with rough bumpy textured skin with warts",
  "with wrinkled leathery skin",
  "with smooth shiny skin",
  "with scaly reptilian skin texture",
  "with mottled patchy skin",
  "with scarred battle-worn skin",
  "with spotted freckled skin",
  "with cracked dry skin texture",
  "with oily shiny greasy skin",
  "with hairy fuzzy skin patches",
  "with crusty rough skin",
  "with weathered aged skin texture"
];

// 👒 Goblin head items (30 options)
const HEAD_ITEMS = [
  "wearing worn leather tricorn pirate hat",
  "wearing rusty metal viking helmet with horns",
  "wearing tattered wizard pointed hat",
  "wearing dirty cloth headband",
  "wearing skull cap bone helmet",
  "wearing iron crown rusted",
  "wearing broken bucket helmet",
  "wearing feathered tribal headdress",
  "wearing patched bandana",
  "wearing cracked horned helmet",
  "wearing old leather cap worn",
  "wearing fur barbarianhelmet",
  "wearing chain mail coif armor",
  "wearing wooden tribal mask",
  "wearing mushroom cap hat fantasy",
  "wearing torn hood cloak",
  "wearing goggles steampunk brass",
  "wearing animal skull helmet",
  "wearing bronze circlet ancient",
  "wearing straw farmer hat",
  "wearing jester hat bells",
  "wearing metal bucket rusty",
  "wearing leaf crown natural",
  "wearing antler crown bone",
  "wearing hood with horns demonic",
  "wearing tribal bone headdress",
  "wearing cracked pottery helmet",
  "wearing fungus mushroom cap",
  "wearing scrap metal helmet mad max",
  "no headwear bald goblin head"
];

// 👀 Goblin eye items (18 options)
const EYE_ITEMS = [
  "wearing broken cracked goggles",
  "wearing leather eye patch pirate",
  "wearing rusty metal monocle",
  "wearing dirty round glasses",
  "wearing bone frame spectacles",
  "wearing scrap metal visor",
  "wearing wooden tribal mask",
  "wearing bandage over one eye",
  "wearing goggles with colored lenses",
  "wearing iron eye protection",
  "wearing clockwork mechanical eye",
  "wearing crystal gem monocle",
  "wearing leather aviator goggles",
  "wearing shaman tribal eye paint",
  "wearing steampunk brass goggles",
  "wearing broken mirror goggles",
  "wearing skull eye mask",
  "natural goblin eyes large yellow"
];

// 👄 Goblin mouth items (15 options)
const MOUTH_ITEMS = [
  "smoking old wooden pipe tobacco",
  "holding dead rat in teeth",
  "smoking cigar stub dirty",
  "chewing on bone",
  "holding dagger blade in teeth",
  "smoking herb pipe magical",
  "holding gold coin in mouth",
  "chewing tobacco plug",
  "holding cork bottle in teeth",
  "smoking clay pipe",
  "biting rope thick",
  "holding key in teeth rusty",
  "smoking mushroom pipe hallucinogenic",
  "chewing on leather strap",
  "grinning showing sharp jagged teeth"
];

// 👕 Goblin clothing (30 options) - FANTASY STYLE!
const CLOTHING = [
  "wearing tattered leather armor battle-worn",
  "wearing dirty brown linen rags",
  "wearing patched cloth tunic medieval",
  "wearing rusty chain mail armor",
  "wearing fur vest barbaric",
  "wearing leather jerkin studded",
  "wearing tattered wizard robes",
  "wearing scale mail armor bronze",
  "wearing burlap sack tunic",
  "wearing patchwork leather jacket scrap",
  "wearing tribal animal hide vest",
  "wearing torn cloth shirt",
  "wearing iron plate armor dented",
  "wearing hooded cloak torn",
  "wearing mercenary leather coat",
  "wearing pirate vest with buckles",
  "wearing prisoner rags chains",
  "wearing apron blacksmith leather",
  "wearing noble stolen doublet",
  "wearing monk robes brown",
  "wearing bandit leather armor",
  "wearing scavenger patchwork armor",
  "wearing tribal war paint no shirt",
  "wearing bone armor primitive",
  "wearing stolen knight armor damaged",
  "wearing sailor vest nautical",
  "wearing alchemist robes stained",
  "wearing peasant tunic simple",
  "wearing gladiator armor leather straps",
  "bare chested muscular goblin warrior"
];

// ⛓️ Goblin neck items (16 options)
const NECK_ITEMS = [
  "wearing bone necklace with skulls",
  "wearing rusty iron collar slave",
  "wearing tooth necklace trophy",
  "wearing leather strap necklace",
  "wearing gold chain stolen loot",
  "wearing tribal bead necklace",
  "wearing rope noose hanging",
  "wearing medallion bronze tarnished",
  "wearing fur collar",
  "wearing spiked collar iron",
  "wearing pendant skull charm",
  "wearing amulet glowing magical",
  "wearing key ring necklace",
  "wearing coin necklace looted",
  "wearing scarf torn dirty",
  "no neck accessory bare neck"
];

// 🗡️ Goblin hand items (35 options) - WEAPONS & LOOT!
const HAND_ITEMS = [
  "holding rusty curved dagger blade ready",
  "holding wooden club spiked nails",
  "holding leather coin pouch bulging with gold",
  "holding small wooden shield cracked",
  "holding crossbow loaded bolt aimed",
  "holding torch burning flame",
  "holding battle axe chipped blade",
  "holding shortsword rusty blade",
  "holding mace iron heavy",
  "holding spear pointed wooden shaft",
  "holding bow with arrow nocked ready",
  "holding sack bag of loot",
  "holding lantern oil lamp glowing",
  "holding skull drinking cup",
  "holding potion vial bubbling liquid",
  "holding bomb black powder round",
  "holding chain with hook weapon",
  "holding pickaxe mining tool",
  "holding rope coiled",
  "holding meat leg cooked eating",
  "holding stolen chicken",
  "holding fish caught",
  "holding mushroom magical large",
  "holding treasure chest small wooden",
  "holding key ring multiple keys",
  "holding lockpick tools thief",
  "holding map scroll parchment",
  "holding bottle liquor rum",
  "holding tankard ale beer mug",
  "holding wand magical wooden",
  "holding net fishing trap",
  "holding hammer blacksmith tool",
  "holding knife throwing blade",
  "making fist clenched threatening gesture",
  "scratching head confused thinking pose"
];

// 🎨 Background colors (12 options) - FANTASY ATMOSPHERES!
const BACKGROUNDS = [
  "dark dungeon stone wall gray",
  "murky green swamp foggy",
  "warm tavern interior wooden",
  "misty forest dark green",
  "cave rocky brown",
  "gloomy castle gray stone",
  "foggy graveyard atmosphere eerie",
  "torchlit dungeon orange glow",
  "mossy ruins ancient green",
  "dark alley cobblestone",
  "underground cavern dark",
  "stormy sky gray clouds"
];

// 😠 Goblin facial expressions (12 options)
const EXPRESSIONS = [
  "angry scowling fierce threatening",
  "evil grinning sinister wicked smile",
  "grumpy frowning annoyed irritated",
  "cackling laughing maniacal crazy",
  "sneaky scheming plotting mischievous grin",
  "confused puzzled stupid dumb look",
  "aggressive snarling teeth bared",
  "greedy hungry drooling",
  "surprised shocked wide-eyed",
  "tired exhausted weary",
  "proud confident smug",
  "battle-scarred veteran warrior tough"
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
    "fantasy illustration, painted digital art, RPG character portrait",
    `detailed ${BASE_CHARACTER} ${skinColor} ${skinTexture}`,
    `${expression}, large pointed ears, sharp nose crooked`,
    "small hunched posture, thin wiry muscular arms",
    `${headItem}`,
    `${eyeItem}`,
    `${mouthItem}`,
    `${clothing}`,
    `${neckItem}`,
    `${handItem}`,
    "standing pose front view centered, full body visible",
    "highly detailed painted style, traditional fantasy art aesthetic",
  "textured brush strokes visible, matte painting quality",
    "dramatic lighting with shadows, depth and atmosphere",
    `${background} background atmospheric mood`,
    "Dungeons and Dragons style, Warhammer art, World of Warcraft aesthetic",
    "professional fantasy book cover art quality, detailed illustration"
  ].join(", ");

  const negative = [
    "3D render, CGI, Pixar, Disney, smooth plastic, glossy 3D",
    "anime, manga, kawaii, cute, adorable, chibi proportions",
    "photorealistic, photograph, realistic human, cosplay",
    "blurry, low quality, amateur, sketchy draft, unfinished",
    "text, watermark, logo, signature, caption, frame border",
    "multiple characters, cropped incomplete, floating parts",
    "modern clothing, contemporary, t-shirt, jeans, sneakers",
    "colorful rainbow, bright happy, cheerful cartoon"
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
    console.log("🧌 Generating FANTASY GOBLIN character...");
    
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
            num_inference_steps: 50,
            guidance_scale: 8.0,
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
