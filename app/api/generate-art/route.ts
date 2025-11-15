export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import sharp from "sharp";
import ColorThief from "colorthief";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

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


// Random pick, may also sometimes pick "none"
function rand(arr: string[]) {
  const val = arr[Math.floor(Math.random() * arr.length)];
  return Math.random() < 0.12 ? "" : val;  // ~12% of NFTs will have no item for more visual clarity
}

async function extractPaletteFromPFP(pfpUrl: string): Promise<string[]> {
  try {
    const res = await fetch(pfpUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const colorThief = new ColorThief();
    const colors = await colorThief.getPalette(buffer, 4);
    return colors.map(rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
  } catch (e) {
    return [
      "rgb(100, 200, 150)",
      "rgb(80, 150, 200)",
      "rgb(255, 180, 100)",
      "rgb(200, 100, 200)"
    ];
  }
}

function buildPrompt(palette: string[]) {
  const mainColor = palette[0];
  const accentColor = palette[1] || palette[0];
  const eyeColor = palette[2] || accentColor;
  const detailColor = palette[3] || mainColor;

  // PICK ONLY ONE (OR NONE) OF EACH
  const headItem = rand(HEAD_ITEMS);
  const eyeItem = rand(EYE_ITEMS);
  const mouthItem = rand(MOUTH_ITEMS);
  const clothing = rand(CLOTHING);
  const neckItem = rand(NECK_ITEMS);
  const handItem = rand(HAND_ITEMS);
  const expression = rand(EXPRESSIONS);

  // STRICT "POSE TEMPLATE" PROMPT
  const prompt = [
    "ultra-flat simple, clean 2D cartoon sticker, thick black lines, soft color blocks, fixed template mascot",
    "body: oval blob, exactly 400px wide by 450px tall, always same pose and proportions, standing upright",
    "head: round, 180px diameter, attached to top of body, small pointed ears on each side",
    "legs: two, short/stubby, identical size and placement, 60px tall 30px wide, always visible",
    "arms: two, short, rounded, 70px long 25px thick, hanging down at sides, no gesture, no overlap",
    `skin and background are exactly ${mainColor}, eyes ${eyeColor}, accents and details ${accentColor} and ${detailColor}`,
    `"${expression}" facial expression, well-centered and clear, not exaggerated`,
    `${headItem ? headItem + ", perfectly centered on head, no tilt, nothing else on head" : ""}`,
    `${eyeItem ? eyeItem + ", centered precisely on eyes, not covering face features" : ""}`,
    `${mouthItem ? mouthItem + ", aligned just below nose, fully within face" : ""}`,
    `${clothing ? clothing + ", fitted to torso, not covering arms or neck" : ""}`,
    `${neckItem ? neckItem + ", snug around neck, visible, no overlap with head or body" : ""}`,
    `${handItem ? handItem + ", object held in right hand only, no overlap, all hands visible" : ""}`,
    "all accessories separate, do not overlap, do not obscure body, all in proper place",
    "front view, straight toward viewer, full body visible"
  ].filter(Boolean).join(", ");

  const negative = [
    "dramatic shading, cast shadow, gradient color, improper lighting, 3D",
    "multiple characters, cropped, background scenery, floating objects",
    "side view, turned, 3/4 view, looking left or right, back view",
    "asymmetrical arms, legs, or head, body not oval, wrong proportions",
    "overlapping accessories, misplaced items, floating accessories",
    "too many accessories, visual clutter, messy details, broken limbs",
    "blurry, broken, corrupted, low quality, sketch"
  ].join(", ");

  return { prompt, negative };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userPfpUrl = body?.pfpUrl || body?.userPfpUrl;
    if (!userPfpUrl)
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });

    const palette = await extractPaletteFromPFP(userPfpUrl);
    const { prompt, negative } = buildPrompt(palette);

const userSeed = getSeedFromUserOrTraits(userPfpUrl, selectedTraits);

const output: any = await replicate.run(
  "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
  {
    input: {
      prompt,
      negative_prompt: negative,
      image: userPfpUrl,
      num_inference_steps: 40,
      width: 1024,
      height: 1024,
      guidance_scale: 8.5,
      scheduler: "DPMSolverMultistep",
      seed: userSeed, // always the same for the same user or trait
    },
  }
);


    const imageUrl = Array.isArray(output) ? output[0] : output;
    if (!imageUrl)
      return NextResponse.json({ error: "No image generated" }, { status: 500 });

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Fetch failed: ${imageResponse.status}` },
        { status: 502 }
      );
    }

    const imgBuf = Buffer.from(await imageResponse.arrayBuffer());
    const croppedBuffer = await sharp(imgBuf)
      .resize(1024, 1024)
      .png()
      .toBuffer();
    const dataUrl = `data:image/png;base64,${croppedBuffer.toString("base64")}`;

    return NextResponse.json({
      generated_image_url: dataUrl,
      imageUrl: dataUrl,
      palette,
      prompt,
      success: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}
