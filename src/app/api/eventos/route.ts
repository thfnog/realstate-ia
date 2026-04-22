import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import type { Evento, EventoComDetalhes } from '@/lib/database.types';

export async function GET() {
  try {
    if (mock.isMockMode()) {
       mock.seedTestData();
       const events = mock.getEventos();
       return NextResponse.json(events);
    }

    const { data, error } = await supabaseAdmin
      .from('eventos')
      .select('*, lead:leads(*), corretor:corretores(*)')
      .order('data_hora', { ascending: true });

    if (error) {
       return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[API Eventos GET Error]:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imobiliaria_id, lead_id, tipo, titulo, data_hora, local, descricao } = body;
    let { corretor_id } = body;

    if (!imobiliaria_id || !lead_id || !data_hora || !titulo) {
       return NextResponse.json({ error: 'Faltando campos obrigatórios' }, { status: 400 });
    }

    // 1. Broker Assignment (if not provided, fetch from Lead)
    if (!corretor_id && !mock.isMockMode()) {
      const { data: lead } = await supabaseAdmin
        .from('leads')
        .select('corretor_id')
        .eq('id', lead_id)
        .maybeSingle();
      
      if (lead?.corretor_id) {
        corretor_id = lead.corretor_id;
      }
    }

    const eventData: Omit<Evento, 'id' | 'criado_em'> = {
      imobiliaria_id,
      lead_id,
      corretor_id: corretor_id || null,
      tipo: tipo || 'outro',
      titulo,
      data_hora,
      local: local || null,
      descricao: descricao || null,
      status: 'agendado',
    };

    if (mock.isMockMode()) {
       const newEvent = mock.createEvento(eventData);
       return NextResponse.json(newEvent, { status: 201 });
    }

    const { data, error } = await supabaseAdmin
      .from('eventos')
      .insert(eventData)
      .select()
      .single();

    if (error) {
       return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2. WhatsApp Notification to Lead
    // We do this in a separate try/catch to not block the event creation response
    try {
      const { data: fullDetails } = await supabaseAdmin
        .from('eventos')
        .select(`
          *,
          lead:leads(nome, telefone),
          corretor:corretores(nome, whatsapp_instance),
          imobiliaria:imobiliarias(config_pais)
        `)
        .eq('id', data.id)
        .single();
      
      if (fullDetails?.lead?.telefone && fullDetails?.corretor) {
        const { sendWhatsAppMessage } = await import('@/lib/whatsapp');
        const { format } = await import('date-fns');
        const { ptBR } = await import('date-fns/locale');
        
        const dateObj = new Date(data.data_hora);
        const dateStr = format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        const leadName = fullDetails.lead.nome.split(' ')[0];
        const countryCode = (fullDetails.imobiliaria as any)?.config_pais || 'BR';

        const message = 
`*Novo Agendamento Confirmado!* 📅

Olá ${leadName}, o ${fullDetails.corretor.nome} agendou um encontro com você:

📍 *Tipo:* ${data.tipo === 'visita' ? '🏠 Visita' : '🤝 Reunião'}
⏰ *Hora:* ${dateStr}
🏢 *Local:* ${data.local || 'A combinar'}
📝 *Assunto:* ${data.titulo}
${data.descricao ? `💡 *Obs:* ${data.descricao}` : ''}

Ficamos à disposição!`;

        await sendWhatsAppMessage(
          fullDetails.lead.telefone, 
          message, 
          fullDetails.corretor.whatsapp_instance || undefined,
          countryCode
        );
        console.log(`✅ Notificação de agendamento enviada para ${fullDetails.lead.nome}`);
      }
    } catch (notifyError) {
      console.error('⚠️ Falha ao enviar notificação de agendamento:', notifyError);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[API Eventos POST Error]:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
