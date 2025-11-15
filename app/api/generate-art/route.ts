// app/api/generate-art/route.ts
// Next.js App Route (Node runtime) for NFT generation with Flux Kontext Pro.
// - Accepts pfpUrl / input_image / imageUrl
// - Composites the user PFP into a fixed goblin body template (so body/silhouette stays identical).
// - Extracts average face color from the PFP (face-crop) and forces skin base color in the prompt.
// - Forces per-trait selections (clothing, headgear, hands, eye_item, mouth, accessory, skinTrait).
// - Enforces 2D NFT style and tries to avoid photoreal/3D outputs.
// - Single-response compatibility: count === 1 returns { generated_image_url, imageUrl, seed, traits, success }.

import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

/* ---------------------------
   CONFIG / PROMPTS / LISTS
   --------------------------- */

// MASTER_PROMPT — locked to GOBLIN identity; allows small cosmetic face changes
const MASTER_PROMPT = `
Transform this character into a randomized NFT variant while preserving the original background, pose, and environment exactly.
Do NOT modify the background in any way. Only change the allowed trait layers described below.

IMPORTANT: This character is a GOBLIN. Preserve the goblin identity.

### CHARACTER LOCK — goblin identity (strict)
Preserve the original GOBLIN's head shape, skull structure, facial proportions, muzzle/nose shape, ear shape and placement, eye placement (horizontal/vertical positions), and overall silhouette exactly.
Do NOT replace the goblin with another species or redesign the head shape or facial proportions.
Do NOT alter the relative positions of the eyes, nose, mouth, or ears.
Do NOT change the body proportions or silhouette.

### EYES (style allowed)
You MAY change the appearance/style of the eyes only — color, glow, pupil shape, added goggles/monocle/eye-patch, laser/holographic effects or accessories over the eyes.
You MUST NOT change the eyes' absolute placement or spacing on the face.

### ALLOWED FACE VARIATIONS (minor, cosmetic)
Small cosmetic changes to the face are allowed: add/remove short facial hair (beard/mustache), change skin/fur color hues slightly, small warpaint/scars/makeup details, subtle color shifts. These changes MUST NOT change facial proportions or anatomy.

### ALLOWED CHANGES (full freedom)
The ONLY things allowed to change are: clothing, accessories, hand items, weapons, headgear, glasses, expressions, mouth shapes, eye STYLE (color/glow/accessories), small facial cosmetics (beard, small color shifts), and props.
Stylization should affect ONLY the character and not the background or lighting.

### FINAL RULE
If any generation attempts to replace the head, change the species, or significantly alter facial proportions, discard and regenerate. Keep the base character identical across generations except for allowed cosmetic changes.
`.trim();

// Enforce 2D NFT look and ban photoreal/3D
const STYLE_ENFORCEMENT = `
Force art style: 2D flat vector / cel-shaded / cartoon NFT style, limited palette, bold outlines, clean flat colors, crisp shading, no photorealism.
Do NOT produce 3D renders, baked lighting, film grain, DSLR/photo effects, raytraced reflections, realistic textures, or hyperrealistic skin.
Use simple stylized shadows and highlights (cel shading), consistent line weight, and saturated but limited color palette typical for NFT collectibles.
`.trim();

const NEGATIVE_PROMPT = `
photorealistic, real photo, 3D render, photoreal, ultra realistic, DSLR, bokeh, depth of field, octane render, unreal engine, cinema4d, vray, raytracing, film grain, over-detailed skin pores, hyperrealistic, studio lighting, HDR, blurry background, extra background elements, watermark
`.trim();

// Trait lists (unchanged content - expand if needed)
const CLOTHING_LIST = [
  "small leather vest worn on torso",
  "tiny torn rags covering body",
  "simple cloth tunic on body",
  "small fur vest on torso",
  "simple leather jerkin on body",
  "tiny torn robes on body",
  "small patchwork leather on body",
  "tiny animal hide covering torso",
  "simple torn shirt on body",
  "small iron armor on torso",
  "tiny torn cloak over shoulders",
  "simple leather coat on body",
  "small pirate vest on torso",
  "tiny sailor vest on body",
  "bare chest showing chubby belly",
  "hawaiian shirt floral on body",
  "tuxedo jacket fancy on torso",
  "hoodie with hood down on body",
  "tank top sleeveless on torso",
  "sweater knitted on body",
  "denim jacket on torso",
  "bomber jacket on body",
  "tracksuit jacket on torso",
  "polo shirt collared on body",
  "football jersey on torso",
  "basketball jersey on body",
  "chef coat white on torso",
  "lab coat white on body",
  "ninja suit black on torso",
  "samurai armor on body",
  "superhero cape on shoulders",
  "wizard robe long on body",
  "monk robe brown on body",
  "kimono traditional on body",
  "poncho over shoulders",
];

const HEAD_ITEMS = [
  "small leather cap on top of head",
  "tiny metal helmet on top of head",
  "cloth hood covering head",
  "small bandana on head",
  "bone helmet on top of head",
  "small iron crown on top of head",
  "wizard hat on top of head",
  "fur hat on head",
  "small horned helmet on head",
  "skull cap on top of head",
  "straw hat on head",
  "pointed hood covering head",
  "war paint marks on face",
  "animal pelt on head",
  "bald head no hat",
  "viking helmet with horns on head",
  "cowboy hat on top of head",
  "pirate tricorn hat on head",
  "chef hat tall white on head",
  "baseball cap worn backwards on head",
  "bucket hat on top of head",
  "beanie knit cap on head",
  "beret tilted on head",
  "sombrero on top of head",
  "top hat tall on head",
  "fedora hat on head",
  "samurai kabuto helmet on head",
  "ninja hood covering head",
  "santa hat red on head",
  "party hat cone on head",
];

const HAND_ITEMS = [
  "holding small rusty dagger in hand",
  "gripping tiny wooden club in hand",
  "holding small coin bag in hand",
  "holding tiny wooden shield in hand",
  "holding small torch in hand",
  "gripping tiny battle axe in hand",
  "holding small shortsword in hand",
  "gripping tiny iron mace in hand",
  "holding small wooden spear in hand",
  "holding tiny bow in hand",
  "holding small loot sack in hand",
  "holding tiny lantern in hand",
  "holding small skull cup in hand",
  "holding tiny potion vial in hand",
  "gripping tiny pickaxe in hand",
  "holding small meat leg in hand",
  "holding small keys in hand",
  "holding small bottle in hand",
  "gripping tiny hammer in hand",
  "both hands clenched in small fists",
  "holding smartphone in hand",
  "gripping game controller in hands",
  "holding coffee cup in hand",
  "gripping microphone in hand",
  "holding pizza slice in hand",
  "gripping magic wand in hand",
  "holding book open in hand",
  "gripping telescope in hand",
  "holding magnifying glass in hand",
  "gripping fishing rod in hand",
  "holding basketball in hands",
  "gripping baseball bat in hand",
  "holding trophy golden in hand",
  "gripping drumsticks in hands",
  "holding guitar small in hand",
  "gripping paintbrush in hand",
  "holding camera in hand",
  "gripping sword katana in hand",
  "holding gem crystal in hand",
  "gripping staff wooden in hand",
];

const EYE_ITEMS = [
  "small eye patch over one eye",
  "tiny goggles over eyes",
  "small monocle over one eye",
  "round glasses over eyes",
  "bandage covering one eye",
  "tiny aviator goggles over eyes",
  "large round yellow eyes",
  "small beady eyes glowing",
  "wide crazy eyes bulging",
  "squinting menacing eyes",
  "sunglasses cool over eyes",
  "3D glasses red-blue over eyes",
  "steampunk goggles brass over eyes",
  "cyclops single giant eye",
  "heart-shaped glasses over eyes",
  "ski goggles over eyes",
  "swimming goggles over eyes",
  "VR headset over eyes",
  "laser eyes glowing red",
  "star-shaped sunglasses over eyes",
  "cat-eye glasses over eyes",
  "jeweled monocle over one eye",
  "cracked monocle over eye",
  "glowing blue eyes bright",
  "X-ray specs over eyes",
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
  "tongue sticking out cheeky",
];

const ACCESSORIES = [
  "gold chains",
  "earrings",
  "piercings",
  "rings",
  "glasses",
  "cigars",
  "amulets",
  "tech implants",
];

const SKIN_TRAITS = [
  "random skin colors",
  "markings",
  "scales texture",
  "metallic shine",
  "neon glow streaks",
  "spots and patches",
  "holographic sheen",
];

/* ---------------------------
   TEMPLATE / HEAD_BOX
   --------------------------- */
// Adjust TEMPLATE_PATH and HEAD_BOX pixels to match your template image dimensions and the head area.
// The template should be same resolution used for generation (example: 1024x1024)
const TEMPLATE_PATH = path.join(process.cwd(), "public", "templates", "goblin_template.png");
// Example HEAD_BOX — tune depending on your template
const HEAD_BOX = { left: 260, top: 140, width: 500, height: 500 };

/* ---------------------------
   HELPERS: image download, composite, color extraction
   --------------------------- */

async function downloadBuffer(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Make composite data URL by pasting the pfp (resized/cover) into the template HEAD_BOX.
 * Returns data:image/png;base64,...
 */
async function makeCompositeDataUrl(pfpUrl: string, templatePath: string, headBox: { left: number; top: number; width: number; height: number }) {
  // read template (throws if not found)
  const templateBuf = await fs.readFile(templatePath);
  const pfpBuf = await downloadBuffer(pfpUrl);

  // resize/crop face to head box
  const faceBuf = await sharp(pfpBuf)
    .resize(headBox.width, headBox.height, { fit: "cover", position: "centre" })
    .toFormat("png")
    .toBuffer();

  // composite onto template
  const outBuf = await sharp(templateBuf)
    .composite([{ input: faceBuf, left: headBox.left, top: headBox.top }])
    .png()
    .toBuffer();

  return `data:image/png;base64,${outBuf.toString("base64")}`;
}

/**
 * Extract average color of the face area by cropping the PFP to HEAD_BOX ratio then resizing to 1x1
 * Returns { r, g, b } with integer 0-255
 */
async function getAverageFaceColorFromPfp(pfpUrl: string, headBox: { width: number; height: number }) {
  const pfpBuf = await downloadBuffer(pfpUrl);

  // To get a better face color, first center-crop the PFP to same aspect ratio as headBox, then resize to 1x1
  const aspectW = headBox.width;
  const aspectH = headBox.height;

  // compute the best cover resize to preserve face region
  const down = await sharp(pfpBuf)
    .resize({ width: aspectW, height: aspectH, fit: "cover", position: "centre" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // down.data contains raw pixel data for the resized image; we can average or just pick center pixel.
  // Simpler and cheap: compute average of all pixels quickly
  const { data, info } = down;
  const channels = info.channels || 3;
  let rSum = 0,
    gSum = 0,
    bSum = 0,
    count = 0;

  for (let i = 0; i < data.length; i += channels) {
    rSum += data[i];
    gSum += data[i + 1];
    bSum += data[i + 2];
    count++;
  }
  const r = Math.round(rSum / count);
  const g = Math.round(gSum / count);
  const b = Math.round(bSum / count);
  return { r, g, b };
}

/**
 * Fetch an image URL and return data URL (used to embed replicate-hosted URL)
 */
async function fetchImageAsDataUrl(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") || "image/jpeg";
  return `data:${ct};base64,${buf.toString("base64")}`;
}

/* ---------------------------
   Small utilities
   --------------------------- */

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------------------
   API: POST handler
   --------------------------- */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pfpUrl = body?.pfpUrl || body?.input_image || body?.imageUrl;
    if (!pfpUrl) return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });

    const count = Math.max(1, Number(body?.count || 1));
    const styleHint = body?.style ? ` Style hint: ${String(body.style)}.` : "";
    const promptOverride = body?.prompt ? String(body.prompt) : undefined;

    // Shuffle pools for this batch to avoid repeats
    const clothingPool = shuffle(CLOTHING_LIST);
    const headPool = shuffle(HEAD_ITEMS);
    const handPool = shuffle(HAND_ITEMS);
    const eyeItemPool = shuffle(EYE_ITEMS);
    const mouthPool = shuffle(MOUTH_ITEMS);
    const accessoryPool = shuffle(ACCESSORIES);
    const skinPool = shuffle(SKIN_TRAITS);

    const redrawInstructions = `
Redraw only the allowed trait layers: clothing, accessories, hand items, headgear, eye items, mouth items, and small facial cosmetics (beard, small color shifts).
Do NOT replace or redesign the character's facial structure, head shape, eye placement, or overall silhouette.
Do NOT modify the background.
`.trim();

    const basePrompt = promptOverride ? promptOverride : MASTER_PROMPT;

    const default_prompt_strength = typeof body?.prompt_strength === "number" ? body.prompt_strength : 0.45;
    const default_guidance_scale = typeof body?.guidance_scale === "number" ? body.guidance_scale : 18;
    const default_steps = typeof body?.num_inference_steps === "number" ? body.num_inference_steps : 50;

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const results: {
      replicate_url?: string;
      dataUrl?: string;
      seed?: number;
      traits?: Record<string, string | string[]>;
      error?: string;
    }[] = [];

    // 1) Build composite once per request — this ensures fixed body/silhouette for all gens
    let compositeInputImage = pfpUrl;
    try {
      // only attempt composite if template exists
      await fs.access(TEMPLATE_PATH);
      compositeInputImage = await makeCompositeDataUrl(pfpUrl, TEMPLATE_PATH, HEAD_BOX);
    } catch (e) {
      // fallback: composite failed (no template or fetch error) — log and continue using original pfpUrl
      console.warn("Composite failed (template missing or error), falling back to pfpUrl:", String(e?.message || e));
      compositeInputImage = pfpUrl;
    }

    // 2) Extract face average color (crop-like using HEAD_BOX aspect) to force skin base color
    let skinRgb: { r: number; g: number; b: number } | null = null;
    try {
      skinRgb = await getAverageFaceColorFromPfp(pfpUrl, { width: HEAD_BOX.width, height: HEAD_BOX.height });
    } catch (e) {
      console.warn("Failed to get avg face color:", String(e?.message || e));
      skinRgb = null;
    }

    for (let i = 0; i < count; i++) {
      const seed = typeof body?.seed === "number" ? body.seed + i : Math.floor(Math.random() * 1e9);

      // Choose trait items for this iteration (rotate through pool)
      const clothingChoice = clothingPool[i % clothingPool.length];
      const headChoice = headPool[i % headPool.length];
      const handChoice = handPool[i % handPool.length];
      const eyeItemChoice = eyeItemPool[i % eyeItemPool.length];
      const mouthChoice = mouthPool[i % mouthPool.length];
      const accessoryChoice = accessoryPool[i % accessoryPool.length];
      const skinChoice = skinPool[i % skinPool.length];

      // Compose skin color forcing line if we have a color
      const skinColorLine = skinRgb
        ? `Force skin base color: rgb(${skinRgb.r}, ${skinRgb.g}, ${skinRgb.b}). Match overall skin tone to the input PFP color but keep goblin stylization (greenish hues can be applied by the model if needed).`
        : "";

      // Compose forced-traits sentences
      const forcedLines = [
        `Force clothing: ${clothingChoice}.`,
        `Force headgear: ${headChoice}.`,
        `Force hand item: ${handChoice}.`,
        `Force eye item: ${eyeItemChoice}.`,
        `Force mouth item: ${mouthChoice}.`,
        `Force accessory: ${accessoryChoice}.`,
        skinColorLine,
        `Force skin trait: ${skinChoice}.`,
        `Do NOT preserve any previous clothing, accessories, hats or props.`,
      ].filter(Boolean).join("\n");

      // Combine prompts: base + style enforcement + forced lines + rules
      const finalPrompt = [basePrompt, styleHint, forcedLines, STYLE_ENFORCEMENT, redrawInstructions].join("\n");
      const negativePrompt = NEGATIVE_PROMPT;

      const input = {
        prompt: finalPrompt,
        negative_prompt: negativePrompt,
        input_image: compositeInputImage, // composite ensures same body for all gens
        output_format: "jpg",
        safety_tolerance: 2,
        prompt_upsampling: false,
        prompt_strength: default_prompt_strength,
        guidance_scale: default_guidance_scale,
        num_inference_steps: default_steps,
        seed,
      };

      try {
        const output = await replicate.run("black-forest-labs/flux-kontext-pro", { input });
        const firstUrl = Array.isArray(output) ? output[0] : output;
        const dataUrl = await fetchImageAsDataUrl(firstUrl);

        results.push({
          replicate_url: firstUrl,
          dataUrl,
          seed,
          traits: {
            clothing: clothingChoice,
            head: headChoice,
            hands: handChoice,
            eye_item: eyeItemChoice,
            mouth: mouthChoice,
            accessory: accessoryChoice,
            skin: skinChoice,
          },
        });
      } catch (err: any) {
        results.push({ error: String(err?.message || err), seed });
      }

      if (i < count - 1) await delay(300);
    }

    // Single response shape for backward compatibility
    if (count === 1) {
      const single = results[0];
      if (single?.error) return NextResponse.json({ error: single.error }, { status: 500 });
      return NextResponse.json(
        {
          generated_image_url: single.dataUrl,
          imageUrl: single.dataUrl,
          seed: single.seed,
          traits: single.traits,
          success: true,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, results }, { status: 200 });
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.toLowerCase().includes("nsfw")) {
      return NextResponse.json({ error: "NSFW content detected. Please try a different image!" }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
