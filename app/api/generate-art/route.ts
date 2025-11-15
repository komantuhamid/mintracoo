import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

const MASTER_PROMPT = `
Transform this character into a fully randomized NFT variant while preserving the original background, pose, and environment exactly. 
Do NOT modify the background in any way. Only change the character.

Each generation must be unique, high-variance, and non-repeating. 
Keep only the character’s body shape and identity silhouette.

### EXPRESSIONS (choose ONE at random)
angry scowling, evil grinning maniacally, grumpy frowning, crazy laughing wild,
sneaky smirking, confused dumb, aggressive menacing, proud confident,
surprised shocked wide-eyed, sleepy tired yawning,
excited happy beaming, nervous sweating worried,
silly goofy derpy, cool relaxed chill, mischievous plotting devious.

### CLOTHING (choose ONE at random)
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

### HAND_ITEMS (choose ONE or NONE randomly)
holding small rusty dagger in hand, gripping tiny wooden club in hand,
holding small coin bag in hand, holding tiny wooden shield in hand,
holding small torch in hand, gripping tiny battle axe in hand,
holding small shortsword in hand, gripping tiny iron mace in hand,
holding small wooden spear in hand, holding tiny bow in hand,
holding small loot sack in hand, holding tiny lantern in hand,
holding small skull cup in hand, holding tiny potion vial in hand,
gripping tiny pickaxe in hand, holding small meat leg in hand,
holding small keys in hand, holding small bottle in hand,
gripping tiny hammer in hand, both hands clenched in small fists,
holding smartphone in hand, gripping game controller in hands,
holding coffee cup in hand, gripping microphone in hand,
holding pizza slice in hand, gripping magic wand in hand,
holding book open in hand, gripping telescope in hand,
holding magnifying glass in hand, gripping fishing rod in hand,
holding basketball in hands, gripping baseball bat in hand,
holding trophy golden in hand, gripping drumsticks in hands,
holding guitar small in hand, gripping paintbrush in hand,
holding camera in hand, gripping sword katana in hand,
holding gem crystal in hand, gripping staff wooden in hand.

### EYE_ITEMS (choose ONE randomly)
small eye patch over one eye, tiny goggles over eyes,
small monocle over one eye, round glasses over eyes,
bandage covering one eye, tiny aviator goggles over eyes,
large round yellow eyes, small beady eyes glowing,
wide crazy eyes bulging, squinting menacing eyes,
sunglasses cool over eyes, 3D glasses red-blue over eyes,
steampunk goggles brass over eyes, cyclops single giant eye,
heart-shaped glasses over eyes, ski goggles over eyes,
swimming goggles over eyes, VR headset over eyes,
laser eyes glowing red, star-shaped sunglasses over eyes,
cat-eye glasses over eyes, jeweled monocle over one eye,
cracked monocle over eye, glowing blue eyes bright,
X-ray specs over eyes.

### HEAD_ITEMS (choose ONE randomly)
small leather cap on top of head, tiny metal helmet on top of head,
cloth hood covering head, small bandana on head,
bone helmet on top of head, small iron crown on top of head,
wizard hat on top of head, fur hat on head,
small horned helmet on head, skull cap on top of head,
straw hat on head, pointed hood covering head,
war paint marks on face, animal pelt on head,
bald head no hat, viking helmet with horns on head,
cowboy hat on top of head, pirate tricorn hat on head,
chef hat tall white on head, baseball cap worn backwards on head,
bucket hat on top of head, beanie knit cap on head,
beret tilted on head, sombrero on top of head,
top hat tall on head, fedora hat on head,
samurai kabuto helmet on head, ninja hood covering head,
santa hat red on head, party hat cone on head.

### MOUTH_ITEMS (choose ONE randomly)
huge wide grinning mouth showing many sharp fangs,
giant open mouth with rows of jagged fangs,
massive toothy grin showing pointed fangs,
enormous mouth with multiple rows of sharp fangs,
wide crazy smile showing all sharp teeth,
evil grinning mouth with prominent fangs visible,
creepy smile with sharp jagged teeth,
menacing grin with big fangs,
wicked smile showing rows of teeth,
fierce grinning mouth with fangs,
vampire fangs protruding from mouth,
single gold tooth shining in grin,
missing front teeth gap in smile,
braces on teeth metal visible,
tongue sticking out cheeky.

### ACCESSORIES
gold chains, earrings, piercings, rings, glasses, cigars, amulets, tech implants.

### FINAL RULES
COMPLETELY REDRAW the character’s outfit, headgear, accessories, eyes, mouth, props, and hands.
Do NOT keep or reuse ANY previous clothing, hat, glasses, or accessories.
Do NOT modify or regenerate the background AT ALL.
Stylization affects ONLY the character.
`.trim();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pfpUrl = body?.pfpUrl;

    if (!pfpUrl)
      return NextResponse.json({ error: "pfpUrl required" }, { status: 400 });

    const seed =
      typeof body?.seed === "number"
        ? body.seed
        : Math.floor(Math.random() * 1e9);

    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      {
        input: {
          prompt: MASTER_PROMPT,
          input_image: pfpUrl,
          output_format: "jpg",
          safety_tolerance: 2,
          prompt_upsampling: false,

          // Stronger transformation
          prompt_strength: 0.40,
          guidance_scale: 22,
          num_inference_steps: 50,
          seed,
        },
      }
    );

    if (!output) {
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 }
      );
    }

    // SAME LOGIC YOU WANTED 🎯
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
      seed,
      success: true,
    });

  } catch (e: any) {
    if (e?.message?.toLowerCase().includes("nsfw")) {
      return NextResponse.json(
        { error: "NSFW content detected" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}
