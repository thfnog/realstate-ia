import { NextResponse } from 'next/server';
import * as mock from '@/lib/mockDb';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imobId = searchParams.get('imob_id');

    if (!imobId) {
      return NextResponse.json({ error: 'Faltando imob_id na URL' }, { status: 400 });
    }

    // 1. Security Validation
    const secret = process.env.GRUPOZAP_WEBHOOK_SECRET;
    if (secret) {
      const authHeader = request.headers.get('x-webhook-secret') || request.headers.get('authorization');
      if (authHeader !== secret && authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    console.log(`\n🌐 Webhook Grupo Zap Recebido — imobId: ${imobId}`);

    // 2. Queue or Process
    if (mock.isMockMode()) {
       // Mock processing (simplified)
       return NextResponse.json({ success: true, mock: true });
    }

    const { supabaseAdmin } = await import('@/lib/supabase');
    const { error } = await supabaseAdmin
      .from('webhook_ingestion_queue')
      .insert({
        imobiliaria_id: imobId,
        source: 'grupozap',
        payload: body,
        status: 'pendente'
      });

    if (error) {
      console.error('❌ Erro ao enfileirar webhook Zap:', error);
      return NextResponse.json({ error: 'Erro ao salvar na fila' }, { status: 500 });
    }

    return NextResponse.json({ success: true, queued: true }, { status: 202 });

  } catch (err) {
    console.error('Erro no webhook Grupo Zap:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
