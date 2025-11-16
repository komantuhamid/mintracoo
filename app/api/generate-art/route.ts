// app/api/generate-art/route.ts
// Enhanced: force per-trait selections with weighted rarity + uniqueness + blacklist support.
// - Node runtime
// - Accepts pfpUrl/input_image/imageUrl
// - Supports single or batch (count)
// - Returns single dataURL when count===1, otherwise results array with metadata

import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
if (!REPLICATE_TOKEN) {
  throw new Error("REPLICATE_API_TOKEN environment variable is required.");
}
const replicate = new Replicate({ auth: REPLICATE_TOKEN });

/* ---------------- PROMPTS (kept as before) ---------------- */
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

const STYLE_ENFORCEMENT = `
Force art style: 2D flat vector / cel-shaded / cartoon NFT style, limited palette, bold outlines, clean flat colors, crisp shading, no photorealism.
Place character centered inside a rounded-square crop/frame with uniform solid background color matching the input background.
Do NOT produce 3D renders, baked lighting, film grain, DSLR/photo effects, raytraced reflections, realistic skin pores, or hyperrealistic textures.
`.trim();

const PRESERVE_BG_LINE = `Preserve the input background exactly. Do NOT add particles, stars, sparkles, confetti, floating dots, noise, or any extra background elements.`;
const BODY_LOCK_LINE = `
CRITICAL: KEEP THE BODY & SILHOUETTE EXACT. Render the character's BODY layer exactly the SAME SHAPE, SAME POSE, SAME PROPORTIONS and in the SAME POSITION every generation.
Only change clothes/accessories/props/facial cosmetic details inside or on top of that fixed body silhouette. Do NOT move, resize, or reshape the body or change the pose.
`;
const NEGATIVE_PROMPT = `photorealistic, real photo, 3D render, photoreal, ultra realistic, DSLR, bokeh, depth of field, octane render, unreal engine, cinema4d, vray, raytracing, film grain, hyperrealistic, studio lighting, HDR, watermark,
particles, sparkles, stars, confetti, dust, noise, black speckles, white speckles, floating dots, glitter, lens flare, bokeh spots, artifacts`.trim();

/* ---------------- TRAITS + WEIGHTS ---------------- */

// Each trait entry can be either string or { name, weight }.
// weight: higher = more common. default weight = 1.
type TraitSpec = string | { name: string; weight?: number };

const CLOTHING_LIST: TraitSpec[] = [
  { name: "small leather vest worn on torso", weight: 6 },
  { name: "tiny torn rags covering body", weight: 2 },
  { name: "simple cloth tunic on body", weight: 5 },
  { name: "small fur vest on torso", weight: 4 },
  { name: "simple leather jerkin on body", weight: 4 },
  { name: "tiny torn robes on body", weight: 2 },
  { name: "small patchwork leather on body", weight: 3 },
  { name: "tiny animal hide covering torso", weight: 2 },
  { name: "simple torn shirt on body", weight: 6 },
  { name: "small iron armor on torso", weight: 1 },
  { name: "tiny torn cloak over shoulders", weight: 2 },
  { name: "simple leather coat on body", weight: 4 },
  { name: "small pirate vest on torso", weight: 3 },
  { name: "tiny sailor vest on body", weight: 3 },
  { name: "bare chest showing chubby belly", weight: 4 },
  { name: "hawaiian shirt floral on body", weight: 2 },
  { name: "tuxedo jacket fancy on torso", weight: 1 },
  { name: "hoodie with hood down on body", weight: 5 },
  { name: "tank top sleeveless on torso", weight: 3 },
  { name: "sweater knitted on body", weight: 3 },
  { name: "denim jacket on torso", weight: 4 },
  { name: "bomber jacket on body", weight: 3 },
  { name: "tracksuit jacket on torso", weight: 2 },
  { name: "polo shirt collared on body", weight: 3 },
  { name: "football jersey on torso", weight: 2 },
  { name: "basketball jersey on body", weight: 2 },
  { name: "chef coat white on torso", weight: 1 },
  { name: "lab coat white on body", weight: 1 },
  { name: "ninja suit black on torso", weight: 1 },
  { name: "samurai armor on body", weight: 1 },
  { name: "superhero cape on shoulders", weight: 1 },
  { name: "wizard robe long on body", weight: 1 },
  { name: "monk robe brown on body", weight: 1 },
  { name: "kimono traditional on body", weight: 1 },
  { name: "poncho over shoulders", weight: 2 },
];

const HEAD_ITEMS: TraitSpec[] = [
  { name: "small leather cap on top of head", weight: 6 },
  { name: "tiny metal helmet on top of head", weight: 2 },
  { name: "cloth hood covering head", weight: 4 },
  { name: "small bandana on head", weight: 5 },
  { name: "bone helmet on top of head", weight: 1 },
  { name: "small iron crown on top of head", weight: 1 },
  { name: "wizard hat on top of head", weight: 1 },
  { name: "fur hat on head", weight: 3 },
  { name: "small horned helmet on head", weight: 1 },
  { name: "skull cap on top of head", weight: 2 },
  { name: "straw hat on head", weight: 1 },
  { name: "pointed hood covering head", weight: 1 },
  { name: "war paint marks on face", weight: 4 },
  { name: "animal pelt on head", weight: 1 },
  { name: "bald head no hat", weight: 2 },
  { name: "viking helmet with horns on head", weight: 1 },
  { name: "cowboy hat on top of head", weight: 2 },
  { name: "pirate tricorn hat on head", weight: 1 },
  { name: "chef hat tall white on head", weight: 1 },
  { name: "baseball cap worn backwards on head", weight: 4 },
  { name: "bucket hat on top of head", weight: 2 },
  { name: "beanie knit cap on head", weight: 4 },
  { name: "beret tilted on head", weight: 2 },
  { name: "sombrero on top of head", weight: 1 },
  { name: "top hat tall on head", weight: 1 },
  { name: "fedora hat on head", weight: 2 },
  { name: "samurai kabuto helmet on head", weight: 1 },
  { name: "ninja hood covering head", weight: 1 },
  { name: "santa hat red on head", weight: 1 },
  { name: "party hat cone on head", weight: 1 },
];

const HAND_ITEMS: TraitSpec[] = [
  { name: "holding small rusty dagger in hand", weight: 3 },
  { name: "gripping tiny wooden club in hand", weight: 2 },
  { name: "holding small coin bag in hand", weight: 3 },
  { name: "holding tiny wooden shield in hand", weight: 2 },
  { name: "holding small torch in hand", weight: 2 },
  { name: "gripping tiny battle axe in hand", weight: 1 },
  { name: "holding small shortsword in hand", weight: 2 },
  { name: "gripping tiny iron mace in hand", weight: 1 },
  { name: "holding small wooden spear in hand", weight: 1 },
  { name: "holding tiny bow in hand", weight: 1 },
  { name: "holding small loot sack in hand", weight: 2 },
  { name: "holding tiny lantern in hand", weight: 2 },
  { name: "holding small skull cup in hand", weight: 1 },
  { name: "holding tiny potion vial in hand", weight: 2 },
  { name: "gripping tiny pickaxe in hand", weight: 1 },
  { name: "holding small meat leg in hand", weight: 1 },
  { name: "holding small keys in hand", weight: 2 },
  { name: "holding small bottle in hand", weight: 2 },
  { name: "gripping tiny hammer in hand", weight: 1 },
  { name: "both hands clenched in small fists", weight: 3 },
  { name: "holding smartphone in hand", weight: 2 },
  { name: "gripping game controller in hands", weight: 1 },
  { name: "holding coffee cup in hand", weight: 2 },
  { name: "gripping microphone in hand", weight: 1 },
  { name: "holding pizza slice in hand", weight: 1 },
  { name: "gripping magic wand in hand", weight: 1 },
  { name: "holding book open in hand", weight: 2 },
  { name: "gripping telescope in hand", weight: 1 },
  { name: "holding magnifying glass in hand", weight: 1 },
  { name: "gripping fishing rod in hand", weight: 1 },
  { name: "holding basketball in hands", weight: 1 },
  { name: "gripping baseball bat in hand", weight: 1 },
  { name: "holding trophy golden in hand", weight: 1 },
  { name: "gripping drumsticks in hands", weight: 1 },
  { name: "holding guitar small in hand", weight: 1 },
  { name: "gripping paintbrush in hand", weight: 1 },
  { name: "holding camera in hand", weight: 1 },
  { name: "gripping sword katana in hand", weight: 1 },
  { name: "holding gem crystal in hand", weight: 1 },
  { name: "gripping staff wooden in hand", weight: 1 },
];

const EYE_ITEMS: TraitSpec[] = [
  { name: "small eye patch over one eye", weight: 2 },
  { name: "tiny goggles over eyes", weight: 4 },
  { name: "small monocle over one eye", weight: 2 },
  { name: "round glasses over eyes", weight: 4 },
  { name: "bandage covering one eye", weight: 1 },
  { name: "tiny aviator goggles over eyes", weight: 2 },
  { name: "large round yellow eyes", weight: 2 },
  { name: "small beady eyes glowing", weight: 2 },
  { name: "wide crazy eyes bulging", weight: 1 },
  { name: "squinting menacing eyes", weight: 3 },
  { name: "sunglasses cool over eyes", weight: 3 },
  { name: "3D glasses red-blue over eyes", weight: 1 },
  { name: "steampunk goggles brass over eyes", weight: 1 },
  { name: "cyclops single giant eye", weight: 0.5 },
  { name: "heart-shaped glasses over eyes", weight: 0.5 },
  { name: "ski goggles over eyes", weight: 1 },
  { name: "swimming goggles over eyes", weight: 0.5 },
  { name: "VR headset over eyes", weight: 0.5 },
  { name: "laser eyes glowing red", weight: 0.8 },
  { name: "star-shaped sunglasses over eyes", weight: 0.5 },
  { name: "cat-eye glasses over eyes", weight: 1.5 },
  { name: "jeweled monocle over one eye", weight: 0.7 },
  { name: "cracked monocle over eye", weight: 0.4 },
  { name: "glowing blue eyes bright", weight: 0.8 },
  { name: "X-ray specs over eyes", weight: 0.3 },
];

const MOUTH_ITEMS: TraitSpec[] = [
  { name: "huge wide grinning mouth showing many sharp fangs", weight: 3 },
  { name: "giant open mouth with rows of jagged fangs", weight: 1 },
  { name: "massive toothy grin showing pointed fangs", weight: 2 },
  { name: "enormous mouth with multiple rows of sharp fangs", weight: 1 },
  { name: "wide crazy smile showing all sharp teeth", weight: 2 },
  { name: "evil grinning mouth with prominent fangs visible", weight: 2 },
  { name: "creepy smile with sharp jagged teeth", weight: 1 },
  { name: "menacing grin with big fangs", weight: 2 },
  { name: "wicked smile showing rows of teeth", weight: 1 },
  { name: "fierce grinning mouth with fangs", weight: 2 },
  { name: "vampire fangs protruding from mouth", weight: 1 },
  { name: "single gold tooth shining in grin", weight: 1 },
  { name: "missing front teeth gap in smile", weight: 1 },
  { name: "braces on teeth metal visible", weight: 0.3 },
  { name: "tongue sticking out cheeky", weight: 1 },
];

const ACCESSORIES: TraitSpec[] = [
  { name: "gold chains", weight: 1 },
  { name: "earrings", weight: 3 },
  { name: "piercings", weight: 2 },
  { name: "rings", weight: 2 },
  { name: "glasses", weight: 4 },
  { name: "cigars", weight: 1 },
  { name: "amulets", weight: 1.5 },
  { name: "tech implants", weight: 0.7 },
];

const SKIN_TRAITS: TraitSpec[] = [
  { name: "random skin colors", weight: 5 },
  { name: "markings", weight: 4 },
  { name: "scales texture", weight: 1 },
  { name: "metallic shine", weight: 0.5 },
  { name: "neon glow streaks", weight: 0.5 },
  { name: "spots and patches", weight: 3 },
  { name: "holographic sheen", weight: 0.2 },
];

/* ---------------- helpers: weighted pick, unique enforcement, blacklist ---------------- */

function asTraitName(t: TraitSpec) {
  return typeof t === "string" ? t : t.name;
}
function asTraitWeight(t: TraitSpec) {
  return typeof t === "string" ? 1 : (t.weight ?? 1);
}
// pick weighted item from list, optionally excluding a blacklist set
function weightedPick(list: TraitSpec[], exclude = new Set<string>()) {
  const pool = list
    .map((t) => ({ name: asTraitName(t), w: asTraitWeight(t) }))
    .filter((p) => !exclude.has(p.name) && p.w > 0);
  if (pool.length === 0) return null;
  const total = pool.reduce((s, p) => s + p.w, 0);
  let r = Math.random() * total;
  for (const p of pool) {
    r -= p.w;
    if (r <= 0) return p.name;
  }
  return pool[pool.length - 1].name;
}

// deterministic-ish rotate fallback: try rotate until unique, else pick first non-blacklisted
function rotatePick(pool: TraitSpec[], idx: number, exclude = new Set<string>()) {
  const n = pool.length;
  for (let j = 0; j < n; j++) {
    const cand = asTraitName(pool[(idx + j) % n]);
    if (!exclude.has(cand)) return cand;
  }
  // fallback to weightedPick ignoring exclude
  return asTraitName(pool[0]);
}

/* ---------------- rate limiter + validators (same as before) ---------------- */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const PARALLEL_LIMIT = 3;
const rateMap = new Map<string, { timestamps: number[]; running: number }>();
function rateCheck(ip: string) {
  const now = Date.now();
  if (!rateMap.has(ip)) rateMap.set(ip, { timestamps: [now], running: 0 });
  const entry = rateMap.get(ip)!;
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
function isValidImageUrl(urlStr: string) {
  try {
    const url = new URL(urlStr);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const path = url.pathname.toLowerCase();
    if (path.endsWith(".png") || path.endsWith(".jpg") || path.endsWith(".jpeg") || path.endsWith(".webp")) return true;
    return url.protocol === "https:";
  } catch {
    return false;
  }
}
async function headCheckImage(url: string) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) return { ok: false, status: res.status };
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return { ok: false, status: 415 };
    const len = res.headers.get("content-length");
    const size = len ? parseInt(len, 10) : undefined;
    if (size && size > 8 * 1024 * 1024) return { ok: false, status: 413 };
    return { ok: true, contentType: ct, size };
  } catch (e) {
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

/* ---------------- API handler ---------------- */

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").split(",")[0].trim();

  if (!rateCheck(ip)) return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
  if (!parallelEnter(ip)) return NextResponse.json({ error: "Too many concurrent requests. Try again in a moment." }, { status: 429 });

  try {
    const body = await req.json();
    const pfpUrl = body?.pfpUrl || body?.input_image || body?.imageUrl;
    if (!pfpUrl) { parallelExit(ip); return NextResponse.json({ error: "pfpUrl required" }, { status: 400 }); }
    if (typeof pfpUrl !== "string" || !isValidImageUrl(pfpUrl)) { parallelExit(ip); return NextResponse.json({ error: "Invalid pfpUrl. Must be a valid HTTPS image URL." }, { status: 400 }); }

    const count = Math.max(1, Math.min(8, Number(body?.count || 1)));
    const styleHint = body?.style ? ` Style hint: ${String(body.style)}` : "";
    const promptOverride = body?.prompt ? String(body.prompt).slice(0, 4000) : undefined;
    const blacklist = body?.blacklist || {}; // e.g. { head: ["wizard hat on top of head"], clothing: [...] }

    const head = await headCheckImage(pfpUrl);
    if (!head.ok) { parallelExit(ip); return NextResponse.json({ error: "Failed to validate pfpUrl image or file too large", status: head.status || 400 }, { status: 400 }); }

    // shuffle pools (we still use rotation fallback + weightedPick)
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

    const width = Math.min(1024, Math.max(128, Number(body?.width || 1024)));
    const height = Math.min(1024, Math.max(128, Number(body?.height || 1024)));

    // keep track of used combos in this batch to avoid exact duplicates
    const usedCombos = new Set<string>();

    for (let i = 0; i < count; i++) {
      const seed = seedBase !== undefined ? seedBase + i : Math.floor(Math.random() * 1e9);

      // build exclude sets from blacklist and previously used items (to increase variety)
      const exclClothing = new Set<string>(Array.isArray(blacklist?.clothing) ? blacklist.clothing : []);
      const exclHead = new Set<string>(Array.isArray(blacklist?.head) ? blacklist.head : []);
      const exclHand = new Set<string>(Array.isArray(blacklist?.hands) ? blacklist.hands : []);
      const exclEye = new Set<string>(Array.isArray(blacklist?.eye_items) ? blacklist.eye_items : []);
      const exclMouth = new Set<string>(Array.isArray(blacklist?.mouth) ? blacklist.mouth : []);
      const exclAccessory = new Set<string>(Array.isArray(blacklist?.accessories) ? blacklist.accessories : []);
      const exclSkin = new Set<string>(Array.isArray(blacklist?.skin) ? blacklist.skin : []);

      // Avoid choosing the same exact trait twice in the same batch when possible:
      // also avoid items already used in usedCombos (exact same set)
      // We'll do weightedPick but pass exclude sets including items used in previous iterations for that category.
      const clothingChoice = weightedPick(clothingPool, exclClothing) ?? rotatePick(clothingPool, i, exclClothing);
      exclClothing.add(clothingChoice);

      const headChoice = weightedPick(headPool, exclHead) ?? rotatePick(headPool, i, exclHead);
      exclHead.add(headChoice);

      const handChoice = weightedPick(handPool, exclHand) ?? rotatePick(handPool, i, exclHand);
      exclHand.add(handChoice);

      // For eye items we want stronger diversity — prefer weightedPick but also ensure not duplicated often
      const eyeChoice = weightedPick(eyeItemPool, exclEye) ?? rotatePick(eyeItemPool, i, exclEye);
      exclEye.add(eyeChoice);

      const mouthChoice = weightedPick(mouthPool, exclMouth) ?? rotatePick(mouthPool, i, exclMouth);
      exclMouth.add(mouthChoice);

      const accessoryChoice = weightedPick(accessoryPool, exclAccessory) ?? rotatePick(accessoryPool, i, exclAccessory);
      exclAccessory.add(accessoryChoice);

      const skinChoice = weightedPick(skinPool, exclSkin) ?? rotatePick(skinPool, i, exclSkin);
      exclSkin.add(skinChoice);

      // ensure combo uniqueness: create combo key and if exists, nudge by picking alternate clothing/head if possible
      let comboKey = `${clothingChoice}|${headChoice}|${handChoice}|${eyeChoice}|${mouthChoice}|${accessoryChoice}|${skinChoice}`;
      if (usedCombos.has(comboKey)) {
        // try swapping clothing to next rotate to avoid exact duplicate
        const altClothing = rotatePick(clothingPool, i + 1, exclClothing);
        if (altClothing && altClothing !== clothingChoice) {
          comboKey = `${altClothing}|${headChoice}|${handChoice}|${eyeChoice}|${mouthChoice}|${accessoryChoice}|${skinChoice}`;
        }
      }
      usedCombos.add(comboKey);

      // compose forced-traits sentences
      const forcedLines = [
        `Force clothing: ${clothingChoice}.`,
        `Force headgear: ${headChoice}.`,
        `Force hand item: ${handChoice}.`,
        `Force eye item: ${eyeChoice}.`,
        `Force mouth item: ${mouthChoice}.`,
        `Force accessory: ${accessoryChoice}.`,
        `Force skin trait: ${skinChoice}.`,
        `Do NOT preserve any previous clothing, accessories, hats or props.`,
        `DO NOT modify the background under any circumstances.`,
        `DO NOT change the character species or head shape.`,
        `Ensure the character remains the same identity silhouette; only change the listed traits.`,
        BODY_LOCK_LINE,
      ].join("\n");

      const finalPrompt = [
        STYLE_ENFORCEMENT,
        basePrompt,
        styleHint,
        forcedLines,
        PRESERVE_BG_LINE,
        redrawInstructions,
      ].join("\n");

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
            eye_item: eyeChoice,
            mouth: mouthChoice,
            accessory: accessoryChoice,
            skin: skinChoice,
          },
        });
      } catch (err: any) {
        results.push({ error: String(err?.message || err), seed });
      }

      if (i < count - 1) await new Promise((r) => setTimeout(r, delayMs));
    }

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
