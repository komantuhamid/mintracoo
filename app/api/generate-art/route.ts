import { NextResponse } from 'next/server';
import sharp from 'sharp';

// موديل يدعم img2img (edit بالصورة + برومبت)
const MODEL_ID = 'timbrooks/instruct-pix2pix';
const API_URL = `https://api-inference.huggingface.co/models/${MODEL_ID}`;
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || '';

/** حمل صورة بعناوين URL وحولها لبفر */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`failed to download pfp: ${r.status}`);
  const arr = await r.arrayBuffer();
  return Buffer.from(arr);
}

function buildPrompt(style?: string) {
  // برومبت صارم لـ pixel art raccoon
  const core =
    'Transform this face into a pixel art raccoon avatar: headshot, 8-bit, crisp squares, dark eye-mask, rounded ears, simple flat background, limited color palette, clean outline, no text, no watermark, cute expression.';
  // ممكن تضيف style إضافي، لكن نخلي الأساس دومًا واضح
  return style ? `${core} Style hints: ${style}.` : core;
}

/** Pixelate: ننقص الحجم بزاف ثم نرجع نطلّعو بـ nearest neighbor */
async function pixelate(input: Buffer, targetMax = 512, block = 8) {
  const img = sharp(input);
  const meta = await img.metadata();
  const w = meta.width || 512;
  const h = meta.height || 512;

  // نخلي الصورة مربعة تقريباً ونحدّها للماكس
  const scale = Math.max(w, h) > targetMax ? targetMax / Math.max(w, h) : 1;
  const newW = Math.max(1, Math.round(w * scale));
  const newH = Math.max(1, Math.round(h * scale));

  // نحسب حجم الشبكة (block size) بشكل معقول
  const pxDownW = Math.max(16, Math.floor(newW / block));
  const pxDownH = Math.max(16, Math.floor(newH / block));

  // downscale ثم upscale بـ nearest باش يبان الـ “بيكسل”
  const down = await sharp(input)
    .resize(pxDownW, pxDownH, { fit: 'fill', kernel: sharp.kernel.nearest })
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
    const { pfp_url, style } = body as { pfp_url?: string; style?: string };

    if (!HF_TOKEN) {
      return NextResponse.json({ error: 'Missing HUGGINGFACE_API_TOKEN' }, { status: 500 });
    }
    if (!pfp_url) {
      return NextResponse.json({ error: 'missing pfp_url' }, { status: 400 });
    }

    const sourceBuf = await fetchImageBuffer(pfp_url);
    const prompt = buildPrompt(style);

    // --------- المحاولة 1: JSON (بعض الموديلات كتقبل) ---------
    const tryJson = async () => {
      const dataUrl = `data:image/png;base64,${sourceBuf.toString('base64')}`;
      return fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // instruct-pix2pix يتوقّع {image, prompt}
          inputs: { image: dataUrl, prompt },
          options: { wait_for_model: true },
        }),
      });
    };

    // --------- المحاولة 2: multipart (fallback) ---------
    const tryMultipart = async () => {
      const form = new FormData();
      form.append('image', new Blob([sourceBuf], { type: 'image/png' }), 'pfp.png');
      form.append('prompt', prompt);
      // يمكن إضافة parameters عند الحاجة
      return fetch(API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${HF_TOKEN}` },
        body: form,
      });
    };

    let resp = await tryJson();
    if (!resp.ok) {
      // لو رفض الصيغة، جرّب multipart
      resp = await tryMultipart();
    }

    if (!resp.ok) {
      const txt = await resp.text();
      return NextResponse.json({ error: txt || 'hf_error' }, { status: resp.status });
    }

    // HF كيرجع الصورة كبانيري
    const outBlob = await resp.blob();
    const outBuf = Buffer.from(await outBlob.arrayBuffer());

    // Pixelation حتمي باش نضمن “pixel art”
    const pixelated = await pixelate(outBuf, 512, 8);

    const base64 = pixelated.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    return NextResponse.json({ generated_image_url: dataUrl });
  } catch (e: any) {
    console.error('HF generate error:', e);
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
