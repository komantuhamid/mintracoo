import { NextResponse } from 'next/server';
import sharp from 'sharp';

const MODEL_ID = 'timbrooks/instruct-pix2pix'; // img2img
const API_URL = `https://api-inference.huggingface.co/models/${MODEL_ID}`;
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || '';

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`failed to download pfp: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

function buildPrompt(style?: string) {
  const core =
    'Transform this face into a pixel art raccoon avatar: headshot, 8-bit, crisp square pixels, dark eye-mask, rounded ears, limited color palette, clean outline, simple flat background, no text, no watermark, cute expression.';
  return style ? `${core} Style hints: ${style}.` : core;
}

async function pixelate(input: Buffer, targetMax = 512, blocks = 8) {
  const meta = await sharp(input).metadata();
  const w = meta.width || 512;
  const h = meta.height || 512;
  const scale = Math.max(w, h) > targetMax ? targetMax / Math.max(w, h) : 1;
  const newW = Math.max(1, Math.round(w * scale));
  const newH = Math.max(1, Math.round(h * scale));
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
    const { pfp_url, style } = (await req.json().catch(() => ({}))) as {
      pfp_url?: string;
      style?: string;
    };

    if (!HF_TOKEN) {
      return NextResponse.json({ error: 'Missing HUGGINGFACE_API_TOKEN' }, { status: 500 });
    }
    if (!pfp_url) {
      return NextResponse.json({ error: 'missing pfp_url' }, { status: 400 });
    }

    const src = await fetchImageBuffer(pfp_url);
    const prompt = buildPrompt(style);

    // ALWAYS use multipart for img2img
    const form = new FormData();
    form.append('image', new Blob([src], { type: 'image/png' }), 'pfp.png');
    form.append('prompt', prompt);
    // بعض الموديلات كتفهم parameters
    form.append('parameters', JSON.stringify({ guidance_scale: 5 }));

    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        Accept: 'image/png', // نطلب صورة مباشرة
        'X-Wait-For-Model': 'true',
      },
      body: form,
    });

    // لو رجع HTML/JSON، نوضح السبب عوض ما نعرض HTML
    const ct = resp.headers.get('content-type') || '';
    if (!resp.ok || !ct.includes('image')) {
      const text = await resp.text();
      // رسائل مفهومة للمستخدم
      let friendly = 'Hugging Face error';
      if (resp.status === 401 || resp.status === 403) {
        friendly = 'Hugging Face: token غير صالح أو لازم تقبل شروط الموديل.';
      } else if (resp.status === 404) {
        friendly = 'الموديل غير متاح على Inference API.';
      } else if (resp.status === 429) {
        friendly = 'تم تجاوز الحد (rate limit). جرّب بعد لحظات.';
      } else if (ct.includes('text/html')) {
        friendly = 'الطلب مشى لصفحة الويب بدل الـ API (تأكد من الـ token والشروط).';
      }
      return NextResponse.json({ error: friendly, details: text }, { status: resp.status || 500 });
    }

    const buf = Buffer.from(await resp.arrayBuffer());
    const pixel = await pixelate(buf, 512, 8);
    const dataUrl = `data:image/png;base64,${pixel.toString('base64')}`;
    return NextResponse.json({ generated_image_url: dataUrl });
  } catch (e: any) {
    console.error('HF generate error:', e);
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
