import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import * as mock from '@/lib/mockDb';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { message } = await request.json();
    let lead;

    // 1. Get lead phone and broker instance
    if (mock.isMockMode()) {
      const l = mock.getLeads().find(l => l.id === id);
      if (l) {
        const c = mock.getCorretorById(l.corretor_id || '');
        lead = { 
          telefone: l.telefone, 
          instanceName: c?.whatsapp_instance || `realstate-iabroker-${c?.id}` 
        };
      }
    } else {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select(`
          telefone,
          corretor_id,
          corretores (
            id,
            whatsapp_instance
          )
        `)
        .eq('id', id)
        .single();
      
      if (data) {
        const c = data.corretores as any;
        lead = {
          telefone: data.telefone,
          instanceName: c?.whatsapp_instance || `realstate-iabroker-${c?.id || data.corretor_id}`
        };
      }
    }

    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

    // 2. Send WhatsApp
    await sendWhatsAppMessage(lead.telefone, message, lead.instanceName);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Erro ao enviar mensagem manual:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
