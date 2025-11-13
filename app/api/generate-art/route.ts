export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

const STABILITY_API_KEY = process.env.STABILITY_API_KEY || "";

// Keep all your COLOR_SCHEMES exactly as they are - they're fine!
const GOBLIN_COLOR_SCHEMES = [
  // ... your 72 color schemes stay the same
];

// ✅ FIXED: Much shorter accessory descriptions
const HEAD_ITEMS = [
  "wizard hat", "party hat", "viking helmet", "crown", "baseball cap",
  "cowboy hat", "chef hat", "beanie", "santa hat", "no hat"
];

const EYE_ITEMS = [
  "big eyes", "sunglasses", "goggles", "eyepatch", "monocle",
  "glowing eyes", "angry eyes", "happy eyes"
];

const MOUTH_ITEMS = [
  "big toothy grin", "fangs showing", "tongue out",
  "smile", "frown", "open mouth"
];

const CLOTHING = [
  "vest", "robe", "armor", "tunic", "jacket", "cape"
];

const NECK_ITEMS = [
  "necklace", "scarf", "collar", "bowtie", "nothing"
];

const HAND_ITEMS = [
  "sword", "staff", "torch", "hammer", "nothing"
];

const EXPRESSIONS = [
  "happy", "angry", "silly", "cool", "excited"
];

function getPersonalizedColor(fid: number): { skin: string; bg: string } {
  const colorIndex = fid % GOBLIN_COLOR_SCHEMES.length;
  return GOBLIN_COLOR_SCHEMES[colorIndex];
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// ✅ FIXED: Much shorter, simpler prompt
function buildPrompt(colorSchemeHint?: { skin: string; bg: string }) {
  const colorScheme = colorSchemeHint || getRandomElement(GOBLIN_COLOR_SCHEMES);
  const skinColor = colorScheme.skin;
  const background = colorScheme.bg;
  const headItem = getRandomElement(HEAD_ITEMS);
  const eyeItem = getRandomElement(EYE_ITEMS);
  const mouthItem = getRandomElement(MOUTH_ITEMS);
  const clothing = getRandomElement(CLOTHING);
  const handItem = getRandomElement(HAND_ITEMS);
  const expression = getRandomElement(EXPRESSIONS);

  const prompt = `flat 2D cartoon goblin, ${skinColor} skin, wearing ${headItem}, ${eyeItem}, ${mouthItem}, ${clothing}, holding ${handItem}, ${expression}, ${background} background, simple flat style, centered`;

  const negative = "3D, realistic, photo, gradient, text, watermark";

  return { prompt, negative };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fid = body?.fid;
    const pfpUrl = body?.pfpUrl;
    
    let selectedColorScheme: { skin: string; bg: string } | undefined;
    
    if (fid && typeof fid === 'number') {
      selectedColorScheme = getPersonalizedColor(fid);
    }

    if (!STABILITY_API_KEY) {
      return NextResponse.json(
        { error: "Missing STABILITY_API_KEY" },
        { status: 500 }
      );
    }

    const { prompt, negative } = buildPrompt(selectedColorScheme);
    
    // ✅ Log prompt length to debug
    console.log("📝 Prompt length:", prompt.length, "chars");
    console.log("📝 Prompt:", prompt);

    let imageData: Buffer;

    if (pfpUrl) {
      console.log("🖼️ img2img");
      
      const pfpResponse = await fetch(pfpUrl);
      if (!pfpResponse.ok) {
        throw new Error(`PFP fetch failed: ${pfpResponse.status}`);
      }
      const pfpBlob = await pfpResponse.blob();
      const pfpBuffer = Buffer.from(await pfpBlob.arrayBuffer());

      const formData = new FormData();
      formData.append('init_image', new Blob([pfpBuffer]), 'pfp.png');
      formData.append('init_image_mode', 'IMAGE_STRENGTH');
      formData.append('image_strength', '0.35');
      formData.append('text_prompts[text]', prompt);
      formData.append('text_prompts[weight]', '1');
      formData.append('text_prompts[text]', negative);[1]
      formData.append('text_prompts[weight]', '-1');[1]
      formData.append('cfg_scale', '7');
      formData.append('samples', '1');
      formData.append('steps', '30');

      const response = await fetch(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STABILITY_API_KEY}`,
            'Accept': 'application/json',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Stability error:", errorText);
        throw new Error(`Stability: ${response.status}`);
      }

      const responseJSON = await response.json();
      imageData = Buffer.from(responseJSON.artifacts.base64, 'base64');

    } else {
      console.log("🎨 text-to-image");
      
      const response = await fetch(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${STABILITY_API_KEY}`,
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            text_prompts: [
              { text: prompt, weight: 1 },
              { text: negative, weight: -1 }
            ],
            cfg_scale: 7,
            height: 1024,
            width: 1024,
            steps: 30,
            samples: 1,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Stability error:", errorText);
        throw new Error(`Stability: ${response.status}`);
      }

      const responseJSON = await response.json();
      imageData = Buffer.from(responseJSON.artifacts.base64, 'base64');
    }

    const dataUrl = `data:image/png;base64,${imageData.toString("base64")}`;

    return NextResponse.json({
      generated_image_url: dataUrl,
      imageUrl: dataUrl,
      success: true
    });
  } catch (e: any) {
    console.error("❌ Error:", e);
    return NextResponse.json({ 
      error: e?.message || "server_error" 
    }, { status: 500 });
  }
}

