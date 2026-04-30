import { NextResponse } from 'next/server';
import { runSyncForImobiliaria } from '@/lib/engine/sync';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    // Check if it's a cron request from Vercel
    const isCron = request.headers.get('x-vercel-cron') === '1';
    
    // If not cron, require some auth or admin token (simplified here, should integrate with next-auth if triggered by UI)
    // Actually, we'll allow an admin to trigger it with imobiliaria_id in the body
    
    if (isCron) {
      console.log('⏰ Executando Vercel Cron: Sincronização de Integrações');
      const results = await runSyncForImobiliaria();
      return NextResponse.json({ message: 'Cron job executado com sucesso', results });
    }

    const body = await request.json().catch(() => ({}));
    const { imobiliaria_id, provider } = body;

    if (!imobiliaria_id) {
      return NextResponse.json({ error: 'imobiliaria_id é obrigatório.' }, { status: 400 });
    }

    const results = await runSyncForImobiliaria(imobiliaria_id, provider);

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('API Sync Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
