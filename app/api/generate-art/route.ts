import { NextResponse } from 'next/server';
import sharp from 'sharp';

const MODEL_ID = 'stabilityai/sdxl-turbo';
const API_URL = `https://api-inference.huggingface.co/models/${MODEL_ID}`;
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || '';

function buildPrompt(style?: string) {
  const base = [
    'pixel art raccoon avatar, 8-bit headshot',
    'cute expression, dark eye-mask, rounded ears',
    'crisp square pixels, clean outline',
    'simple flat background, limited color palette',
    'no text, no watermark, centered portrait',
  ].join(', ');
  return style ? `${base}, ${style}` : base;
}

async function pixelate(input: Buffer, targetMax = 512, blocks = 8) {
  const meta = await sharp(input).metadata();
  const w = meta.width || 512;
  const h = meta.height || 512;
  const scale = Math.max(w, h) > targetMax ? targetMax / Math.max(w, h) : 1;
  const newW = Math.round(w * scale);
  const newH = Math.round(h * scale);
  const downW = Math.max(16, Math.floor(newW / blocks));
  const downH = Math.max(16, Math.floor(newH / blocks));

  const down = await sharp(input)
    .resize(downW, downH, { fit: 'fill', kernel: sharp.kernel.nearest })
    .toBuffer();

  const up = await sharp(down)
    .resize(newW, newH, { fit: 'fill', kernel: sharp.kernel.nearest })
    .toFormat('png')
    .toBuffer();

  return up;
}

export async function POST(req: Request) {
  try {
    const { style } = (await req.json().catch(() => ({}))) as { style?: string };

    if (!HF_TOKEN) {
      return NextResponse.json({ error: 'Missing HUGGINGFACE_API_TOKEN' }, { status: 500 });
    }

    const prompt = buildPrompt(style);

    // SDXL-Turbo: text -> image
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          negative_prompt:
            'text, watermark, low quality, blurry, artifacts, frame, noisy, deformed',
          num_inference_steps: 15,
          guidance_scale: 2.0,
        },
        options: { wait_for_model: true },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: 'Hugging Face API Error', details: txt }, { status: res.status });
    }

    const ct = res.headers.get('content-type') || '';
    let imgBuf: Buffer;

    if (ct.includes('application/json')) {
      // بعض المزودين كيرجعو base64 داخل JSON
      const j = await res.json();
      const b64 = j?.[0]?.image_base64 || j?.image_base64;
      if (!b64) return NextResponse.json({ error: 'Invalid HF JSON output' }, { status: 500 });
      imgBuf = Buffer.from(b64, 'base64');
    } else {
      // معظم الحالات: binary image
      imgBuf = Buffer.from(await res.arrayBuffer());
    }

    // فرض pixel-art ظاهر
    const pixel = await pixelate(imgBuf, 512, 8);
    const dataUrl = `data:image/png;base64,${pixel.toString('base64')}`;

    return NextResponse.json({ generated_image_url: dataUrl });
  } catch (e: any) {
    console.error('HF generate error:', e);
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
