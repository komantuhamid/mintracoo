// app/api/generate-art/route.ts
// Enhanced: force per-trait selections applied to each generation to guarantee variation.
// Safety additions: input validation, URL/content checks, rate limiting, parameter bounds.
// - Node runtime
// - Accepts pfpUrl/input_image/imageUrl
// - Supports single or batch (count)
// - Returns single dataURL when count===1, otherwise results array with metadata

import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
if (!REPLICATE_TOKEN) {
  // This will throw at import time in server environments without token.
  throw new Error("REPLICATE_API_TOKEN environment variable is required.");
}

const replicate = new Replicate({
  auth: REPLICATE_TOKEN,
});

/* ---------------------------
   PROMPTS: MASTER + STYLE + NEGATIVE
   --------------------------- */

const MASTER_PROMPT = `
Transform this character into a fully randomized NFT variant while preserving the original background, pose, and environment exactly.
Do NOT modify the background in any way. Only change the allowed trait layers described below.

IMPORTANT: This character must remain the SAME SPECIES / BASE IDENTITY. Do NOT replace the character or change its silhouette.

### CHARACTER LOCK
Preserve head shape, skull structure, facial proportions, ear placement, eye placement and overall silhouette. Do NOT alter the relative positions of eyes/nose/mouth or change the species.

### ALLOWED CHANGES
You MAY change: clothing, accessories, hand items, weapons, headgear, eye-style (color/glow/accessories), mouth shapes, expressions, small facial cosmetics (beard/warpaint), and skin textures/colors to match the input PFP.
You MUST NOT modify the background or change the body pose/silhouette.

### FINAL RULES
- Each generation must be unique and not reuse the same exact clothing/accessory combination.
- Strong stylization allowed, but keep final output in clear 2D NFT collectible style.
`.trim();

// NFT style enforcement block (inserted to force collection-style look)
const STYLE_ENFORCEMENT = `
Force art style: 2D flat vector / cel-shaded / cartoon NFT style, limited palette, bold outlines, clean flat colors, crisp shading, no photorealism.
Place character centered inside a rounded-square crop/frame with uniform solid background color matching the input background.
Do NOT produce 3D renders, baked lighting, film grain, DSLR/photo effects, raytraced reflections, realistic skin pores, or hyperrealistic textures.
`.trim();

const PRESERVE_BG_LINE = `
Preserve the input background exactly. Do NOT add particles, stars, sparkles, confetti, floating dots, noise, or any extra background elements.
`;

// Strong body-lock instructions (explicit, repeatable)
const BODY_LOCK_LINE = `
CRITICAL: KEEP THE BODY & SILHOUETTE EXACT. Render the character's BODY layer exactly the SAME SHAPE, SAME POSE, SAME PROPORTIONS and in the SAME POSITION every generation.
Only change clothes/accessories/props/facial cosmetic details inside or on top of that fixed body silhouette. Do NOT move, resize, or reshape the body or change the pose.
`;

// Negative prompt to block 3D / particles / artifacts
const NEGATIVE_PROMPT = `
photorealistic, real photo, 3D render, photoreal, ultra realistic, DSLR, bokeh, depth of field, octane render, unreal engine, cinema4d, vray, raytracing, film grain, hyperrealistic, studio lighting, HDR, watermark,
particles, sparkles, stars, confetti, dust, noise, black speckles, white speckles, floating dots, glitter, lens flare, bokeh spots, artifacts
`.trim();

/* ---------------------------
   TRAIT LISTS
   --------------------------- */

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
   helpers
   --------------------------- */

// Basic in-memory rate limiter (per-IP). This is ephemeral and resets on server restart.
// Limits: 30 requests per 60 seconds per IP, and 3 parallel requests.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const PARALLEL_LIMIT = 3;
const rateMap = new Map<string, { timestamps: number[]; running: number }>();

function rateCheck(ip: string) {
  const now = Date.now();
  if (!rateMap.has(ip)) rateMap.set(ip, { timestamps: [now], running: 0 });
  const entry = rateMap.get(ip)!;

  // drop old timestamps
  entry.timestamps = entry.timestamps.filter((t) => now - t <= RATE_LIMIT_WINDOW_MS);
  if (entry.timestamps.length >= RATE_LIMIT_MAX) return false;
  entry.timestamps.push(now);
  return true;
}

function parallelEnter(ip: string) {
  if (!rateMap.has(ip)) rateMap.set(ip, { timestamps: [], running: 0 });
  const entry = rateMap.get(ip)!;
  if (entry.running >= PARALLEL_LIMIT) return false;
  entry.running += 1;
  return true;
}
function parallelExit(ip: string) {
  const entry = rateMap.get(ip);
  if (!entry) return;
  entry.running = Math.max(0, entry.running - 1);
}

// Validate URL is http(s) and looks like an image; restrict to common hosts optionally
function isValidImageUrl(urlStr: string) {
  try {
    const url = new URL(urlStr);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    // basic extension check (may be short-circuited by hosts using redirects)
    const path = url.pathname.toLowerCase();
    if (path.endsWith(".png") || path.endsWith(".jpg") || path.endsWith(".jpeg") || path.endsWith(".webp")) return true;
    // allow unknown extension (some CDNs) but require https
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

async function headCheckImage(url: string) {
  // Attempt a HEAD request; some hosts may not allow HEAD — fallback to GET with range
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) return { ok: false, status: res.status };
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return { ok: false, status: 415 };
    const len = res.headers.get("content-length");
    const size = len ? parseInt(len, 10) : undefined;
    // limit to 8 MB
    if (size && size > 8 * 1024 * 1024) return { ok: false, status: 413 };
    return { ok: true, contentType: ct, size };
  } catch (e) {
    // try small GET
    try {
      const res2 = await fetch(url, { method: "GET", headers: { Range: "bytes=0-1023" } });
      if (!res2.ok) return { ok: false, status: res2.status };
      const ct2 = res2.headers.get("content-type") || "";
      if (!ct2.startsWith("image/")) return { ok: false, status: 415 };
      return { ok: true, contentType: ct2, size: undefined };
    } catch (err) {
      return { ok: false, status: 0 };
    }
  }
}

async function fetchImageAsDataUrl(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") || "image/png";
  return `data:${ct};base64,${buf.toString("base64")}`;
}

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
  // Basic IP detection for rate limiting
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").split(",")[0].trim();

  // Quick rate-limit guard
  if (!rateCheck(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
  }
  if (!parallelEnter(ip)) {
    return NextResponse.json({ error: "Too many concurrent requests. Try again in a moment." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const pfpUrl = body?.pfpUrl || body?.input_image || body?.imageUrl;
    if (!pfpUrl) {
      parallelExit(ip);
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });
    }

    // Basic input validation
    if (typeof pfpUrl !== "string" || !isValidImageUrl(pfpUrl)) {
      parallelExit(ip);
      return NextResponse.json({ error: "Invalid pfpUrl. Must be a valid HTTPS image URL." }, { status: 400 });
    }

    // Protect max count
    const count = Math.max(1, Math.min(8, Number(body?.count || 1))); // cap at 8
    const styleHint = body?.style ? ` Style hint: ${String(body.style)}` : "";
    const promptOverride = body?.prompt ? String(body.prompt).slice(0, 4000) : undefined; // cap prompt length

    // Check external image headers (content-type & size)
    const head = await headCheckImage(pfpUrl);
    if (!head.ok) {
      parallelExit(ip);
      return NextResponse.json({ error: "Failed to validate pfpUrl image or file too large", status: head.status || 400 }, { status: 400 });
    }

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

    // Parameter bounds & sanitization
    const default_prompt_strength = Math.max(0, Math.min(1, Number(body?.prompt_strength ?? 0.5)));
    const default_guidance_scale = Math.max(1, Math.min(35, Number(body?.guidance_scale ?? 24)));
    const default_steps = Math.max(10, Math.min(100, Number(body?.num_inference_steps ?? 50)));
    const seedBase = typeof body?.seed === "number" ? Math.floor(Number(body.seed)) : undefined;

    const delayMs = 300;
    const results: {
      replicate_url?: string;
      dataUrl?: string;
      seed?: number;
      traits?: Record<string, string | string[]>;
      error?: string;
    }[] = [];

    // Validate requested size and forbid huge canvases
    const width = Math.min(1024, Math.max(128, Number(body?.width || 1024)));
    const height = Math.min(1024, Math.max(128, Number(body?.height || 1024)));

    for (let i = 0; i < count; i++) {
      const seed = seedBase !== undefined ? seedBase + i : Math.floor(Math.random() * 1e9);

      // Choose trait items for this iteration (rotate through pool)
      const clothingChoice = clothingPool[i % clothingPool.length];
      const headChoice = headPool[i % headPool.length];
      const handChoice = handPool[i % handPool.length];
      const eyeItemChoice = eyeItemPool[i % eyeItemPool.length];
      const mouthChoice = mouthPool[i % mouthPool.length];
      const accessoryChoice = accessoryPool[i % accessoryPool.length];
      const skinChoice = skinPool[i % skinPool.length];

      // compose forced-traits sentences (with repetition for compliance)
      const forcedLines = [
        `Force clothing: ${clothingChoice}.`,
        `Force headgear: ${headChoice}.`,
        `Force hand item: ${handChoice}.`,
        `Force eye item: ${eyeItemChoice}.`,
        `Force mouth item: ${mouthChoice}.`,
        `Force accessory: ${accessoryChoice}.`,
        `Force skin trait: ${skinChoice}.`,
        `Do NOT preserve any previous clothing, accessories, hats or props.`,
        `DO NOT modify the background under any circumstances.`,
        `DO NOT change the character species or head shape.`,
        `Ensure the character remains the same identity silhouette; only change the listed traits.`,
        BODY_LOCK_LINE,
      ].join("\n");

      // final prompt: NFT style enforcement first so style is applied globally
      const finalPrompt = [
        STYLE_ENFORCEMENT,
        basePrompt,
        styleHint,
        forcedLines,
        PRESERVE_BG_LINE,
        redrawInstructions,
      ].join("\n");

      // Model input; note: some parameters may be ignored by the model
      const input = {
        prompt: finalPrompt,
        negative_prompt: NEGATIVE_PROMPT,
        input_image: pfpUrl,
        output_format: "png",
        width,
        height,
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
        // Basic sanity: returned URL must be string
        if (!firstUrl || typeof firstUrl !== "string") throw new Error("Invalid model output");
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
        // capture error per-iteration and continue
        results.push({ error: String(err?.message || err), seed });
      }

      // polite delay
      if (i < count - 1) await new Promise((r) => setTimeout(r, delayMs));
    }

    // Single response shape for backward compatibility
    if (count === 1) {
      const single = results[0];
      parallelExit(ip);
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

    parallelExit(ip);
    return NextResponse.json({ ok: true, results }, { status: 200 });
  } catch (err: any) {
    parallelExit(ip);
    const msg = String(err?.message || err);
    if (msg.toLowerCase().includes("nsfw")) {
      return NextResponse.json({ error: "NSFW content detected. Please try a different image!" }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
