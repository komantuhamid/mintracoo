export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import sharp from "sharp";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

// 🔥 FIXED SEED FOR IDENTICAL ANATOMY
const GOBLIN_SEED = 42069;

async function autocropToSquare(inputBuffer: Buffer, bgColor = "#1a1a1a"): Promise<Buffer> {
  return await sharp(inputBuffer)
    .trim()
    .resize(1024, 1024, {
      fit: "contain",
      background: bgColor,
    })
    .png()
    .toBuffer();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userPfpUrl = body?.pfpUrl || body?.userPfpUrl;

    if (!userPfpUrl) {
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });
    }

    console.log("🦝 Generating Precise Goblin NFT...");
    console.log("User PFP:", userPfpUrl);

    const output: any = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          image: userPfpUrl,
          prompt: `A chubby cute goblin character NFT with mathematically precise proportions.

🔒 MANDATORY EXACT MEASUREMENTS (NEVER DEVIATE):

BODY STRUCTURE:
- Total character height: 100% baseline
- Head size: exactly 30% of total height
- Body (torso): exactly 40% of total height, round belly shape
- Legs: exactly 30% of total height, short and stubby

HEAD DETAILS (30% height zone):
- Head shape: perfect circle, centered on shoulders
- Ears: pointed triangles, exactly 15% of head height, positioned at 45° angle
- Eyes: large ovals, exactly 8% of head height, positioned 60% up from chin
- Nose: small triangle, exactly 3% of head height, centered between eyes and mouth
- Mouth: wide grin, exactly 12% of head width, showing 6 small teeth
- Eye spacing: exactly 25% of head width between eye centers

ARMS (positioned on upper torso):
- Arm length: exactly 35% of body height
- Arm width: exactly 8% of body width (stubby)
- Hand size: exactly 12% of arm length
- Fingers: 3 stubby fingers per hand, each 5% of hand size
- Arm position: hanging naturally at sides, elbows at 45° bend

LEGS (30% height zone):
- Leg length: exactly 30% of total height
- Leg width: exactly 15% of body width (thick and stumpy)
- Feet: rounded ovals, exactly 20% of leg length
- Toe count: 3 rounded toes per foot, barely visible
- Leg stance: slightly bow-legged, 20% body width apart

CONSISTENCY RULES:
✓ Same exact proportions for every generation
✓ Symmetrical left and right sides
✓ Centered frontal view, no rotation
✓ All body parts visible, nothing hidden
✓ Bold 2px black outlines on all shapes

COLOR CUSTOMIZATION (extract from input image):
- Extract dominant color from input background → use as scene background
- Extract 2nd most common color → use for goblin skin tone
- Extract 3rd color → use for clothing/accessories
- Match the lighting mood and atmosphere of input image
- Apply input image's color temperature (warm/cool)

Style: Premium NFT collectible, bold outlines, high detail, centered composition, perfect PFP format.`,

          negative_prompt: `varying proportions, different anatomy, asymmetrical, inconsistent measurements, 
changing body parts, rotation, side view, hidden limbs, realistic human, thin body, long limbs, normal ears, 
blurry, low quality, multiple goblins, text, watermark, signature, cropped, distorted, uncentered`,

          prompt_strength: 0.68, // 🔥 Balances anatomy consistency + color extraction
          num_inference_steps: 60, // 🔥 More steps = more precision
          width: 1024,
          height: 1024,
          guidance_scale: 11.0, // 🔥 MAXIMUM prompt adherence
          scheduler: "DPMSolverMultistep",
          seed: GOBLIN_SEED, // 🔥 SAME SEED = IDENTICAL ANATOMY
        }
      }
    );

    const imageUrl = Array.isArray(output) ? output[0] : output;
    if (!imageUrl) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${imageResponse.status}` },
        { status: 502 }
      );
    }

    const imgBuf = Buffer.from(await imageResponse.arrayBuffer());
    const croppedBuffer = await autocropToSquare(imgBuf, "#1a1a1a");
    const dataUrl = `data:image/png;base64,${croppedBuffer.toString("base64")}`;

    return NextResponse.json({
      generated_image_url: dataUrl,
      imageUrl: dataUrl,
      success: true,
    });
  } catch (e: any) {
    console.error("Route error:", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
