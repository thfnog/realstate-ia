import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const imovelId = formData.get('imovelId') as string;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Process versions with Sharp
    const thumbBuffer = await sharp(buffer)
      .resize(400, 300, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    const mediaBuffer = await sharp(buffer)
      .resize(1200, 900, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const photoId = randomUUID();
    
    // Convert to Base64 for immediate feedback in the UI without needing a bucket
    const thumbBase64 = `data:image/webp;base64,${thumbBuffer.toString('base64')}`;
    const mediaBase64 = `data:image/webp;base64,${mediaBuffer.toString('base64')}`;

    const newPhoto = {
      id: photoId,
      url_thumb: thumbBase64,
      url_media: mediaBase64,
      url_original: mediaBase64,
      ordem: 0,
      is_capa: false
    };

    return NextResponse.json(newPhoto);
  } catch (err: any) {
    console.error('Erro no processamento de imagem:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
