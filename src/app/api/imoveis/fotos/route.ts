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

    const originalCompressed = await sharp(buffer)
      .webp({ quality: 90 })
      .toBuffer();

    const photoId = randomUUID();
    
    // In a real scenario, we would upload to Supabase Storage here.
    // Since we are in a mock environment, we'll return mock URLs.
    // For local simulation, we'd save to public/uploads or similar.
    
    const mockUrl = `https://placehold.co/1200x900/4F46E5/FFF?text=Imovel+${imovelId}+${photoId}`;

    const newPhoto = {
      id: photoId,
      url_thumb: mockUrl,
      url_media: mockUrl,
      url_original: mockUrl,
      ordem: 0,
      is_capa: false
    };

    return NextResponse.json(newPhoto);
  } catch (err: any) {
    console.error('Erro no processamento de imagem:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
