import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pfpUrl = body?.pfpUrl;
    if (!pfpUrl)
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });

    // Master prompt with expressions + clothing + accessories and background-preserve instruction
    const prompt = `
Transform this character into a randomized NFT variant while preserving the original background, pose, and environment exactly. Do NOT modify the background in any way.
Keep only the character’s body shape and identity, but fully randomize all traits. Each generation must be unique, non-repeating, and high-variance.

### EXPRESSIONS (randomly choose ONE)
angry scowling, evil grinning maniacally, grumpy frowning, crazy laughing wild,
sneaky smirking, confused dumb, aggressive menacing, proud confident,
surprised shocked wide-eyed, sleepy tired yawning,
excited happy beaming, nervous sweating worried,
silly goofy derpy, cool relaxed chill, mischievous plotting devious.

### CLOTHING (randomly choose ONE)
small leather vest worn on torso, tiny torn rags covering body,
simple cloth tunic on body, small fur vest on torso,
simple leather jerkin on body, tiny torn robes on body,
small patchwork leather on body, tiny animal hide covering torso,
simple torn shirt on body, small iron armor on torso,
tiny torn cloak over shoulders, simple leather coat on body,
small pirate vest on torso, tiny sailor vest on body,
bare chest showing chubby belly, hawaiian shirt floral on body,
tuxedo jacket fancy on torso, hoodie with hood down on body,
tank top sleeveless on torso, sweater knitted on body,
denim jacket on torso, bomber jacket on body,
tracksuit jacket on torso, polo shirt collared on body,
football jersey on torso, basketball jersey on body,
chef coat white on torso, lab coat white on body,
ninja suit black on torso, samurai armor on body,
superhero cape on shoulders, wizard robe long on body,
monk robe brown on body, kimono traditional on body,
poncho over shoulders.

### ACCESSORIES (randomly choose some)
gold chains, earrings, piercings, rings, glasses, cigars, amulets, tech implants.

### HEADGEAR (randomly choose ONE)
crown, cap, beanie, bandana, wizard hat, cowboy hat, pirate hat,
samurai helmet, futuristic visor, holographic headband.

### EYES (randomly choose ONE)
laser eyes, glowing neon eyes, sleepy eyes, angry eyes, cyber eyes,
holographic irises, elemental eyes, glitch eyes.

### SKIN TRAITS
random skin colors, markings, textures, glow, metallic shine, spots, or patterns.

Strong stylization ONLY on the character. Do NOT change the background, lighting environment, or scenery.
`.trim();

    const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input: {
        prompt: prompt,
        input_image: pfpUrl,
        output_format: "jpg",
        safety_tolerance: 2,
        prompt_upsampling: false,
      },
    });

    if (!output)
      return NextResponse.json({ error: "No image generated" }, { status: 500 });

    // OPTIONAL: return base64/dataURL preview (this is enabled)
    const imageUrl = Array.isArray(output) ? output[0] : output;
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch generated image: ${imageResponse.status}` },
        { status: 502 }
      );
    }
    const imgBuf = Buffer.from(await imageResponse.arrayBuffer());
    const dataUrl = `data:image/jpeg;base64,${imgBuf.toString("base64")}`;

    return NextResponse.json({
      generated_image_url: dataUrl,
      imageUrl: dataUrl,
      success: true,
    });
  } catch (e: any) {
    if (e?.message?.toLowerCase().includes("nsfw")) {
      return NextResponse.json(
        { error: "NSFW content detected. Please try a different image!" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}
