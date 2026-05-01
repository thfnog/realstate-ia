import { NextResponse } from 'next/server';
import { runSyncForImobiliaria } from '@/lib/engine/sync';

async function handleSync(request: Request) {
  try {
    // Check if it's a cron request from Vercel
    const isCron = request.headers.get('x-vercel-cron') === '1';
    
    if (isCron) {
      console.log('⏰ Executando Vercel Cron: Sincronização de Integrações');
      const results = await runSyncForImobiliaria();
      return NextResponse.json({ message: 'Cron job executado com sucesso', results });
    }

    // Handle manual triggers (usually POST with body)
    let body: any = {};
    if (request.method === 'POST') {
      body = await request.json().catch(() => ({}));
    } else {
      // Allow GET for manual triggers via query params if needed
      const { searchParams } = new URL(request.url);
      body = {
        imobiliaria_id: searchParams.get('imobiliaria_id'),
        provider: searchParams.get('provider')
      };
    }

    const { imobiliaria_id, provider } = body;

    if (!imobiliaria_id && !isCron) {
      return NextResponse.json({ error: 'imobiliaria_id é obrigatório para disparo manual.' }, { status: 400 });
    }

    const results = await runSyncForImobiliaria(imobiliaria_id, provider);
    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('API Sync Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleSync(request);
}

export async function GET(request: Request) {
  return handleSync(request);
}
