import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone) return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 });

    console.log(`[WA DEBUG] Iniciando teste para ${phone}`);
    
    // We send a tiny simple message to avoid formatting issues
    const sid = await sendWhatsAppMessage(phone, 'Teste de Conexão ImobIA - OK 🚀');
    
    return NextResponse.json({ 
      success: true, 
      sid,
      info: 'Se você recebeu a mensagem, a conexão está perfeita!' 
    });
  } catch (err: any) {
    console.error('[WA DEBUG] Falha no teste:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || 'Erro desconhecido',
      details: 'Isso confirma que o payload ou a instância estão com problemas na Evolution API.'
    }, { status: 500 });
  }
}
