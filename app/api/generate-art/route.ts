export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

const STABILITY_API_KEY = process.env.STABILITY_API_KEY || "";

// Keep all your COLOR_SCHEMES exactly as they are - they're fine!
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

