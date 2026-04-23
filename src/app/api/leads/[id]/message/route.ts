import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage, saveMessageToHistory } from '@/lib/whatsapp';
import * as mock from '@/lib/mockDb';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { message } = await request.json();
    let lead;
    let fullLeadData: any;

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
      // Fetch lead first
      const { data: leadData, error: leadError } = await supabaseAdmin
        .from('leads')
        .select('id, telefone, corretor_id, imobiliaria_id')
        .eq('id', id)
        .maybeSingle();
      
      if (leadError) throw leadError;

      if (leadData) {
        fullLeadData = leadData;
        // Fetch broker separately to avoid join/relationship issues (corretores_1 error)
        let broker = null;
        if (leadData.corretor_id) {
          const { data: bData } = await supabaseAdmin
            .from('corretores')
            .select('id, whatsapp_instance')
            .eq('id', leadData.corretor_id)
            .maybeSingle();
          broker = bData;
        }

        // Identify country for prefix logic
        const { data: imob } = await supabaseAdmin
           .from('imobiliarias')
           .select('config_pais')
           .eq('id', leadData.imobiliaria_id)
           .maybeSingle();

        lead = {
          telefone: leadData.telefone,
          instanceName: broker?.whatsapp_instance || `realstate-iabroker-${broker?.id || leadData.corretor_id}`,
          countryCode: imob?.config_pais || 'BR'
        };
      }
    }

    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

    // 2. Send WhatsApp
    const resultId = await sendWhatsAppMessage(lead.telefone, message, lead.instanceName, lead.countryCode);

    // 3. Persist to history
    if (!mock.isMockMode() && fullLeadData) {
      await saveMessageToHistory({
        imobiliaria_id: fullLeadData.imobiliaria_id,
        lead_id: fullLeadData.id,
        corretor_id: fullLeadData.corretor_id,
        direction: 'outbound',
        message_text: message,
        status: 'sent',
        provider_id: resultId
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Erro ao enviar mensagem manual:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
