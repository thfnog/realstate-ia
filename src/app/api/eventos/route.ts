import { NextResponse } from 'next/server';
import { getUserSupabaseClient } from '@/lib/supabase';
import { getEventoRepository } from '@/lib/repositories/factory';
import { getAuthFromCookies } from '@/lib/auth';
import { cookies } from 'next/headers';
import { waitUntil } from '@vercel/functions';
import type { Evento } from '@/lib/database.types';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const leadId = url.searchParams.get('lead_id');

    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    
    const { supabaseAdmin } = await import('@/lib/supabase');
    const isAdmin = session.app_role === 'admin' || session.app_role === 'master';
    const client = isAdmin ? supabaseAdmin : getUserSupabaseClient(token);
    const repository = getEventoRepository(client);

    const events = await repository.findAll({
      imobiliaria_id: session.imobiliaria_id,
      lead_id: leadId || undefined,
      corretor_id: session.app_role === 'corretor' ? session.corretor_id || undefined : undefined
    });

    return NextResponse.json(events);
  } catch (err: any) {
    console.error('[API Eventos GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { lead_id, tipo, titulo, data_hora, local, descricao } = body;
    let { corretor_id } = body;

    if (!lead_id || !data_hora || !titulo) {
       return NextResponse.json({ error: 'Faltando campos obrigatórios' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getEventoRepository(client);

    // 1. Broker Assignment (if not provided, fetch from Lead)
    if (!corretor_id) {
      const { getLeadRepository } = await import('@/lib/repositories/factory');
      const leadRepo = getLeadRepository(client);
      const lead = await leadRepo.findById(lead_id, session.imobiliaria_id);
      if (lead?.corretor_id) {
        corretor_id = lead.corretor_id;
      }
    }

    const eventData: Partial<Evento> = {
      imobiliaria_id: session.imobiliaria_id,
      lead_id,
      corretor_id: corretor_id || null,
      tipo: tipo || 'outro',
      titulo,
      data_hora,
      local: local || null,
      descricao: descricao || null,
      status: 'agendado',
    };

    const data = await repository.create(eventData);

    // 2. WhatsApp Notification to Lead (via waitUntil for reliability)
    waitUntil((async () => {
      try {
        console.log(`[Agendamento] Iniciando processo de notificação para Evento ID: ${data.id}`);

        // We need admin client here because we might need to bypass RLS to fetch complete data if needed, 
        // but since we already have the data, we just need Lead and Corretor details.
        const { getLeadRepository, getCorretorRepository } = await import('@/lib/repositories/factory');
        const leadRepo = getLeadRepository(client);
        const corretorRepo = getCorretorRepository(client);
        
        const lead = await leadRepo.findById(lead_id, session.imobiliaria_id);
        const corretor = corretor_id ? await corretorRepo.findById(corretor_id, session.imobiliaria_id) : null;
        
        // We don't have ImobiliariaRepository yet, but we have session info or can fetch it
        const imobRes = await fetch(`${new URL(request.url).origin}/api/imobiliaria`, {
          headers: { Cookie: cookieStore.toString() }
        });
        const imob = await imobRes.json();

        if (lead?.telefone) {
          const { sendWhatsAppMessage } = await import('@/lib/whatsapp');
          const { format } = await import('date-fns');
          const { ptBR } = await import('date-fns/locale');
          
          const dateObj = new Date(data.data_hora);
          const dateStr = format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
          const leadName = (!lead.nome || lead.nome.startsWith('Lead #')) ? '' : lead.nome.split(' ')[0];
          const countryCode = imob?.config_pais || 'BR';

          const iconMap: Record<string, string> = {
            visita: '🏠 Visita',
            reuniao: '🤝 Reunião',
            assinatura: '✍️ Assinatura',
            cartorio: '🏛️ Cartório',
            vistoria: '🔍 Vistoria',
            outro: '📌 Compromisso'
          };
          const tipoLabel = iconMap[data.tipo] || '📅 Compromisso';

          const msgBody = 
`*Novo Agendamento Confirmado!* 📅

Olá${leadName ? ` ${leadName}` : ''}, ${corretor ? `o ${corretor.nome}` : 'agendamos'} um encontro com você:

📍 *Tipo:* ${tipoLabel}
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
        }
      } catch (notifyError) {
        console.error('❌ Falha ao enviar notificação de agendamento:', notifyError);
      }
    })());

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('[API Eventos POST Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
