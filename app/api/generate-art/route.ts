// لازم NodeJS runtime (sharp ما يخدمش على Edge)
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { HfInference } from '@huggingface/inference';

const MODEL_ID = 'black-forest-labs/FLUX.1-Krea-dev';
const PROVIDER: 'fal-ai' | 'hf-inference' = 'fal-ai';
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || '';

function buildPrompt(extra?: string) {
  const base = [
    'pixel art raccoon avatar, 8-bit headshot',
    'cute expression, dark eye-mask, rounded ears',
    'crisp square pixels, clean outline',
    'simple flat background, limited palette',
    'centered portrait, no text, no watermark',
  ].join(', ');
  return extra ? `${base}, ${extra}` : base;
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
    const body = await req.json().catch(() => ({}));
    const style: string | undefined = body?.style;

    if (!HF_TOKEN) {
      return NextResponse.json({ error: 'Missing HUGGINGFACE_API_TOKEN' }, { status: 500 });
    }

    const prompt = buildPrompt(style);
    const hf = new HfInference(HF_TOKEN);

    // نسمح بأي ناتج (Blob | string) و نطبعوه لباينري
    let output: any = null;
    let lastErr: any = null;

    for (let i = 0; i < 3; i++) {
      try {
        // بعض تعريفات النوع ما كتعرّفش provider، فندوزو any باش ما يوقفش الـ TS
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        output = await (hf.textToImage as any)({
          inputs: prompt,
          model: MODEL_ID,
          provider: PROVIDER,
          parameters: {
            width: 512,
            height: 512,
            num_inference_steps: 8,
            guidance_scale: 2.0,
            negative_prompt:
              'text, watermark, low quality, blurry, artifacts, frame, noisy, deformed',
          },
        });
        break;
      } catch (e: any) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
      }
    }

    if (!output) {
      const msg =
        lastErr?.message ||
        lastErr?.response?.statusText ||
        'Hugging Face Inference error';
      const status = lastErr?.response?.status || 502;
      return NextResponse.json({ error: msg }, { status });
    }

    // طبّع النتيجة لباينري
    let imgBuf: Buffer;
    if (typeof output === 'string') {
      if (output.startsWith('data:image')) {
        // data URL
        const b64 = output.split(',')[1] || '';
        imgBuf = Buffer.from(b64, 'base64');
      } else if (output.startsWith('http')) {
        // URL -> fetch
        const r = await fetch(output);
        if (!r.ok) {
          return NextResponse.json({ error: `Fetch image failed: ${r.status}` }, { status: 502 });
        }
        imgBuf = Buffer.from(await r.arrayBuffer());
      } else {
        return NextResponse.json({ error: 'Unexpected string output from provider' }, { status: 500 });
      }
    } else if (typeof Blob !== 'undefined' && output instanceof Blob) {
      imgBuf = Buffer.from(await output.arrayBuffer());
    } else {
      // بعض المزوّدين كييرجعو { blob, url, … }
      const maybeBlob: Blob | undefined = output?.blob || output?.image || output?.output;
      if (maybeBlob && typeof maybeBlob.arrayBuffer === 'function') {
        imgBuf = Buffer.from(await maybeBlob.arrayBuffer());
      } else {
        return NextResponse.json({ error: 'Unknown provider output format' }, { status: 500 });
      }
    }

    const px = await pixelate(imgBuf, 512, 8);
    const dataUrl = `data:image/png;base64,${px.toString('base64')}`;
    return NextResponse.json({ generated_image_url: dataUrl });
  } catch (e: any) {
    console.error('HF route error:', e);
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
