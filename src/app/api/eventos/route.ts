import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import type { Evento } from '@/lib/database.types';
import { waitUntil } from '@vercel/functions';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const leadId = url.searchParams.get('lead_id');

    const session = await (await import('@/lib/auth')).getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (mock.isMockMode()) {
       mock.seedTestData();
       const events = mock.getEventos(leadId || undefined, undefined, undefined, session.corretor_id || undefined);
       return NextResponse.json(events);
    }

    let query = supabaseAdmin
      .from('eventos')
      .select('*, lead:leads(*), corretor:corretores(*)')
      .eq('imobiliaria_id', session.imobiliaria_id);
    
    // Apply Role Filter
    const { applyRoleFilter } = await import('@/lib/api-utils');
    query = applyRoleFilter(query, session);

    query = query.order('data_hora', { ascending: true });

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    const { data, error } = await query;

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

    // 2. WhatsApp Notification to Lead (via waitUntil for reliability)
    waitUntil((async () => {
      try {
        console.log(`[Agendamento] Iniciando processo de notificação para Evento ID: ${data.id}`);

        // Sequential fetches for maximum robustness (avoid relationship ambiguity)
        const { data: lead } = await supabaseAdmin.from('leads').select('nome, telefone').eq('id', lead_id).single();
        const { data: corretor } = corretor_id ? await supabaseAdmin.from('corretores').select('nome, whatsapp_instance').eq('id', corretor_id).single() : { data: null };
        const { data: imob } = await supabaseAdmin.from('imobiliarias').select('config_pais').eq('id', imobiliaria_id).single();

        if (lead?.telefone) {
          const { sendWhatsAppMessage } = await import('@/lib/whatsapp');
          const { format } = await import('date-fns');
          const { ptBR } = await import('date-fns/locale');
          
          const dateObj = new Date(data.data_hora);
          const dateStr = format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
          const leadName = (!lead.nome || lead.nome.startsWith('Lead #')) ? '' : lead.nome.split(' ')[0];
          const countryCode = imob?.config_pais || 'BR';

          const msgBody = 
`*Novo Agendamento Confirmado!* 📅

Olá${leadName ? ` ${leadName}` : ''}, ${corretor ? `o ${corretor.nome}` : 'agendamos'} um encontro com você:

📍 *Tipo:* ${data.tipo === 'visita' ? '🏠 Visita' : '🤝 Reunião'}
⏰ *Hora:* ${dateStr}
🏢 *Local:* ${data.local || 'A combinar'}
📝 *Assunto:* ${data.titulo}
${data.descricao ? `💡 *Obs:* ${data.descricao}` : ''}

Ficamos à disposição!`;

          const sid = await sendWhatsAppMessage(
            lead.telefone, 
            msgBody, 
            corretor?.whatsapp_instance || undefined,
            countryCode
          );
          
          console.log(`✅ Notificação enviada! SID: ${sid} para ${lead.nome} (${lead.telefone})`);
        } else {
          console.warn(`⚠️ Lead sem telefone ou não encontrado. Notificação pulada.`);
        }
      } catch (notifyError) {
        console.error('❌ Falha CRÍTICA ao enviar notificação de agendamento:', notifyError);
      }
    })());

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[API Eventos POST Error]:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
