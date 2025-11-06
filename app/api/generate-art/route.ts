// ✅ فرض التشغيل على Node.js (sharp ما يخدمش على Edge)
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import sharp from 'sharp';

const MODEL_ID = 'stabilityai/sdxl-turbo'; // text->image
const API_URL = `https://api-inference.huggingface.co/models/${MODEL_ID}`;
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || '';

function buildPrompt(style?: string) {
  const base = [
    'pixel art raccoon avatar, 8-bit headshot',
    'cute expression, dark eye-mask, rounded ears',
    'crisp square pixels, clean outline',
    'simple flat background, limited color palette',
    'no text, no watermark, centered portrait'
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

// 🔁 طلب للـ HF مع retry تلقائي إذا كان 503 (model loading)
async function callHF(prompt: string, tries = 4): Promise<Response> {
  let attempt = 0;
  while (attempt < tries) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Wait-For-Model': 'true',
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

    if (res.status !== 503) return res; // ماشي loading
    // model is loading
    await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    attempt += 1;
  }
  // آخر محاولة
  return fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Wait-For-Model': 'true',
    },
    body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } }),
  });
}

export async function POST(req: Request) {
  try {
    const { style } = (await req.json().catch(() => ({}))) as { style?: string };

    if (!HF_TOKEN) {
      return NextResponse.json({ error: 'Missing HUGGINGFACE_API_TOKEN' }, { status: 500 });
    }

    const prompt = buildPrompt(style);
    const res = await callHF(prompt);

    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      // رجّع تفاصيل مفهومة للواجهة
      let details: any = '';
      try { details = contentType.includes('json') ? await res.json() : await res.text(); } catch {}
      let friendly = 'Hugging Face API Error';

      if (res.status === 401 || res.status === 403)
        friendly = 'Unauthorized: token غير صالح أو خاصك توافق على شروط الموديل (Open model page ثم Agree).';
      else if (res.status === 404)
        friendly = 'Model not available on public Inference API.';
      else if (res.status === 429)
        friendly = 'Rate limit reached. جرّب بعد لحظات.';
      else if (res.status === 503)
        friendly = 'Model is loading… حاول ثانية بعد ثوانٍ.';

      return NextResponse.json({ error: friendly, details }, { status: res.status });
    }

    let imgBuf: Buffer;
    if (contentType.includes('application/json')) {
      const j = await res.json();
      const b64 = j?.[0]?.image_base64 || j?.image_base64;
      if (!b64) return NextResponse.json({ error: 'Invalid HF JSON output' }, { status: 500 });
      imgBuf = Buffer.from(b64, 'base64');
    } else {
      imgBuf = Buffer.from(await res.arrayBuffer());
    }

    const pixel = await pixelate(imgBuf, 512, 8);
    const dataUrl = `data:image/png;base64,${pixel.toString('base64')}`;
    return NextResponse.json({ generated_image_url: dataUrl });
  } catch (e: any) {
    console.error('HF generate error:', e);
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
