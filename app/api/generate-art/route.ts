// لازم NodeJS runtime (باش sharp يخدم)
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { HfInference } from '@huggingface/inference';

// اختار موديل مدعوم عند Inference Providers
// فعلاً Hugging Face كينصح بـ FLUX و SDXL-Lightning
// نبدأ بـ FLUX عبر مزوّد fal-ai (سريع ومتوفر فالرّاوتينغ)
const MODEL_ID = 'black-forest-labs/FLUX.1-Krea-dev';
const PROVIDER: 'fal-ai' | 'hf-inference' = 'fal-ai';

const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || '';

function buildPrompt(extra?: string) {
  const base = [
    'pixel art raccoon avatar, 8-bit headshot',
    'cute expression, dark eye-mask, rounded ears',
    'crisp square pixels, clean outline',
    'simple flat background, limited palette',
    'centered portrait, no text, no watermark'
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

    // عميل رسمي كيخدم مع Inference Providers / Router
    const hf = new HfInference(HF_TOKEN);

    // retry بسيط إلا كان الموديل كيتحمّل
    let blob: Blob | null = null;
    let lastErr: any = null;

    for (let i = 0; i < 3; i++) {
      try {
        // ملاحظة: هاد المتود كتقبل model + provider حسب الوثائق
        // وكترد Blob (raw image bytes)
        // كنطلب حجم 512x512 و few steps باش تكون سريعة
        blob = await hf.textToImage({
          inputs: prompt,
          model: MODEL_ID,
          provider: PROVIDER,
          parameters: {
            width: 512,
            height: 512,
            num_inference_steps: 8,
            guidance_scale: 2.0,
            negative_prompt:
              'text, watermark, low quality, blurry, artifacts, frame, noisy, deformed'
          }
        });
        break;
      } catch (e: any) {
        lastErr = e;
        // إذا كان الموديل كيتحمّل أو rate limit، نصبر شوية ونعاود
        await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
      }
    }

    if (!blob) {
      // نحاول نعطي رسالة واضحة من الخطأ
      const msg =
        lastErr?.message ||
        lastErr?.response?.statusText ||
        'Hugging Face Inference error';
      const status = lastErr?.response?.status || 502;
      return NextResponse.json({ error: msg }, { status });
    }

    const arrBuf = Buffer.from(await blob.arrayBuffer());

    // نطبّق pixelation باش الشكل يكون 8-bit واضح
    const px = await pixelate(arrBuf, 512, 8);
    const dataUrl = `data:image/png;base64,${px.toString('base64')}`;

    return NextResponse.json({ generated_image_url: dataUrl });
  } catch (e: any) {
    console.error('HF route error:', e);
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
