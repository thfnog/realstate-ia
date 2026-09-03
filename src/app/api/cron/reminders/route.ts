import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage, saveMessageToHistory } from '@/lib/whatsapp';
import { sendSlackNotification } from '@/lib/slack';
import * as mock from '@/lib/mockDb';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();
    console.log(`⏰ Iniciando processamento de lembretes em: ${now.toISOString()}`);

    let totalNotified = 0;
    let totalEscalated = 0;
    let totalVisit24h = 0;
    let totalVisit2h = 0;

    if (mock.isMockMode()) {
      mock.seedTestData();
      const imob = mock.getImobiliariaById(mock.DEFAULT_IMOBILIARIA_ID);
      const config_pais = (imob?.config_pais as 'PT' | 'BR') || 'BR';
      const allEvents = mock.getEventos();

      for (const evt of allEvents) {
        if (evt.tipo !== 'visita' || evt.status === 'cancelado' || evt.status === 'realizado') continue;
        const evtDate = new Date(evt.data_hora);
        const diffHours = (evtDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        const lead = evt.lead;
        const corretor = evt.corretor;
        if (!lead || !lead.telefone) continue;

        const leadName = lead.nome ? lead.nome.split(' ')[0] : 'Cliente';
        const tituloImovel = evt.imovel?.titulo || evt.lead?.imoveis?.titulo || evt.titulo;
        const formattedDateStr = format(evtDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        const formattedTimeStr = format(evtDate, "HH:mm", { locale: ptBR });
        const local = evt.local || 'Endereço a combinar com o corretor';
        const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(local)}&navigate=yes`;
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local)}`;
        const corretorNome = corretor?.nome || 'Seu Consultor ImobIA';
        const corretorTelefone = corretor?.telefone || '';

        // 1. Lembrete de 24 horas antes
        if (diffHours <= 26 && diffHours > 2 && !evt.reminder_24h_sent) {
          const msg24h = `🏠 *LEMBRETE DE VISITA AMANHÃ* 📅\n\nOlá *${leadName}*, lembramos da sua visita agendada:\n\n🏡 *Imóvel:* ${tituloImovel}\n📍 *Local:* ${local}\n⏰ *Data e Hora:* ${formattedDateStr}\n👤 *Corretor Responsável:* ${corretorNome}${corretorTelefone ? ` (${corretorTelefone})` : ''}\n\n🗺️ *Links para Navegação:*\n• Waze: ${wazeUrl}\n• Google Maps: ${mapsUrl}\n\nQualquer dúvida ou imprevisto, avise por aqui! Até breve. ✨`;

          await sendWhatsAppMessage(lead.telefone, msg24h, corretor?.whatsapp_instance || undefined, config_pais);
          mock.updateEvento(evt.id, { reminder_24h_sent: true });
          totalVisit24h++;
        }

        // 2. Confirmação Ativa de 2 horas antes
        if (diffHours <= 2.5 && diffHours > 0 && !evt.reminder_2h_sent) {
          const msg2h = `⏰ *CONFIRMAÇÃO DE VISITA HOJE*\n\nOlá *${leadName}*, confirmamos sua visita hoje às *${formattedTimeStr}* no imóvel *${tituloImovel}*?\n\n👉 Digite *1* para *CONFIRMAR*\n👉 Digite *2* para *REAGENDAR*`;

          await sendWhatsAppMessage(lead.telefone, msg2h, corretor?.whatsapp_instance || undefined, config_pais);
          mock.updateEvento(evt.id, { reminder_2h_sent: true });
          totalVisit2h++;
        }
      }

      return NextResponse.json({
        success: true,
        notified: totalNotified,
        escalated: totalEscalated,
        visit_reminders_24h: totalVisit24h,
        visit_reminders_2h: totalVisit2h
      });
    }

    // --- SUPABASE PRODUCTION MODE ---

    // 1. Buscar imobiliárias e suas configurações
    const { data: imobs, error: imobError } = await supabaseAdmin
      .from('imobiliarias')
      .select('id, nome_fantasia, config_lembrete_1_horas, config_lembrete_2_horas, config_pais');

    if (imobError) throw imobError;

    for (const imob of (imobs || [])) {
      const l1_hours = imob.config_lembrete_1_horas || 24;
      const l2_hours = imob.config_lembrete_2_horas || 48;
      const config_pais = (imob.config_pais as 'PT' | 'BR') || 'BR';

      // 2. Lead SLA Reminders (L1 - Corretor WhatsApp)
      const { data: leads, error: leadError } = await supabaseAdmin
        .from('leads')
        .select('*, corretores(*)')
        .eq('imobiliaria_id', imob.id)
        .eq('status', 'novo')
        .is('lembrete_1_enviado_em', null);

      if (!leadError && leads) {
        for (const lead of leads) {
          const criadoEm = new Date(lead.criado_em);
          const diffHours = (now.getTime() - criadoEm.getTime()) / (1000 * 60 * 60);

          if (diffHours >= l1_hours) {
            console.log(`🔔 Enviando Lembrete 1 para Lead: ${lead.nome} (Atraso: ${diffHours.toFixed(1)}h)`);
            
            const corretor = lead.corretores;
            if (corretor && corretor.ativo) {
              const msg = `⏰ *LEMBRETE DE ATENDIMENTO*\n\nO lead *${lead.nome}* (${lead.telefone}) entrou há ${Math.round(diffHours)}h e ainda está com status *Novo*.\n\nPor favor, inicie o atendimento o quanto antes para não perder a oportunidade! 🚀`;
              
              const instance = corretor.whatsapp_instance || `realstate-iabroker-${corretor.id}`;
              await sendWhatsAppMessage(corretor.telefone, msg, instance, config_pais);
              
              await supabaseAdmin
                .from('leads')
                .update({ lembrete_1_enviado_em: now.toISOString() })
                .eq('id', lead.id);
              
              totalNotified++;
            }
          }
        }
      }

      // 3. Lead SLA Escalation (L2 - Slack)
      const { data: leadsL2, error: leadError2 } = await supabaseAdmin
        .from('leads')
        .select('*, corretores(*)')
        .eq('imobiliaria_id', imob.id)
        .eq('status', 'novo')
        .not('lembrete_1_enviado_em', 'is', null)
        .is('lembrete_2_enviado_em', null);

      if (!leadError2 && leadsL2) {
        for (const lead of leadsL2) {
          const l1EnviadoEm = new Date(lead.lembrete_1_enviado_em);
          const diffHoursSinceL1 = (now.getTime() - l1EnviadoEm.getTime()) / (1000 * 60 * 60);

          if (diffHoursSinceL1 >= l2_hours) {
            console.log(`🚨 ESCALONANDO Lead para Slack: ${lead.nome}`);
            
            const slackMsg = `⚠️ *Lead Sem Atendimento (Crítico)*\n\n*Imobiliária*: ${imob.nome_fantasia}\n*Lead*: ${lead.nome}\n*Telefone*: ${lead.telefone}\n*Corretor Atribuído*: ${lead.corretores?.nome || 'Nenhum'}\n*Tempo Total*: ${Math.round((now.getTime() - new Date(lead.criado_em).getTime()) / (1000 * 60 * 60))}h\n\nStatus continua como *NOVO* mesmo após lembrete.`;
            
            await sendSlackNotification(slackMsg, 'reminder');

            await supabaseAdmin
              .from('leads')
              .update({ lembrete_2_enviado_em: now.toISOString() })
              .eq('id', lead.id);
            
            totalEscalated++;
          }
        }
      }

      // 4. RÉGUA DE CONFIRMAÇÃO AUTOMÁTICA DE VISITAS
      const maxFutureTime = new Date(now.getTime() + 30 * 60 * 60 * 1000).toISOString();
      const minPastTime = now.toISOString();

      const { data: visitEvents, error: visitError } = await supabaseAdmin
        .from('eventos')
        .select('*, lead:leads(*, imoveis(*)), corretor:corretores(*)')
        .eq('imobiliaria_id', imob.id)
        .eq('tipo', 'visita')
        .in('status', ['agendado', 'confirmado'])
        .gte('data_hora', minPastTime)
        .lte('data_hora', maxFutureTime);

      if (visitError) {
        console.error(`Erro ao buscar visitas da imobiliária ${imob.id}:`, visitError);
        continue;
      }

      if (visitEvents && visitEvents.length > 0) {
        for (const evt of visitEvents) {
          const evtDate = new Date(evt.data_hora);
          const diffHours = (evtDate.getTime() - now.getTime()) / (1000 * 60 * 60);

          const lead = evt.lead;
          const corretor = evt.corretor;
          if (!lead || !lead.telefone) continue;

          const leadName = lead.nome ? lead.nome.split(' ')[0] : 'Cliente';
          const tituloImovel = evt.imovel?.titulo || evt.lead?.imoveis?.titulo || evt.titulo;
          const formattedDateStr = format(evtDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
          const formattedTimeStr = format(evtDate, "HH:mm", { locale: ptBR });
          const local = evt.local || 'Endereço a combinar com o corretor';
          const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(local)}&navigate=yes`;
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local)}`;
          const corretorNome = corretor?.nome || 'Seu Consultor ImobIA';
          const corretorTelefone = corretor?.telefone || '';
          const instance = corretor?.whatsapp_instance || undefined;

          // 4.1 Lembrete de 24 horas antes
          if (diffHours <= 26 && diffHours > 2 && !evt.reminder_24h_sent) {
            console.log(`🏠 Enviando Lembrete 24h de Visita para ${lead.nome} (${lead.telefone}) - Evento ${evt.id}`);
            
            const msg24h = `🏠 *LEMBRETE DE VISITA AMANHÃ* 📅\n\nOlá *${leadName}*, lembramos da sua visita agendada:\n\n🏡 *Imóvel:* ${tituloImovel}\n📍 *Local:* ${local}\n⏰ *Data e Hora:* ${formattedDateStr}\n👤 *Corretor Responsável:* ${corretorNome}${corretorTelefone ? ` (${corretorTelefone})` : ''}\n\n🗺️ *Links para Navegação:*\n• Waze: ${wazeUrl}\n• Google Maps: ${mapsUrl}\n\nQualquer dúvida ou imprevisto, avise por aqui! Até breve. ✨`;

            await sendWhatsAppMessage(lead.telefone, msg24h, instance, config_pais);

            await saveMessageToHistory({
              imobiliaria_id: imob.id,
              lead_id: lead.id,
              corretor_id: corretor?.id || null,
              direction: 'outbound',
              message_text: msg24h,
              is_bot: true
            });

            await supabaseAdmin
              .from('eventos')
              .update({ reminder_24h_sent: true })
              .eq('id', evt.id);

            totalVisit24h++;
          }

          // 4.2 Confirmação Ativa de 2 horas antes
          if (diffHours <= 2.5 && diffHours > 0 && !evt.reminder_2h_sent) {
            console.log(`⏰ Enviando Confirmação Ativa 2h para ${lead.nome} (${lead.telefone}) - Evento ${evt.id}`);

            const msg2h = `⏰ *CONFIRMAÇÃO DE VISITA HOJE*\n\nOlá *${leadName}*, confirmamos sua visita hoje às *${formattedTimeStr}* no imóvel *${tituloImovel}*?\n\n👉 Digite *1* para *CONFIRMAR*\n👉 Digite *2* para *REAGENDAR*`;

            await sendWhatsAppMessage(lead.telefone, msg2h, instance, config_pais);

            await saveMessageToHistory({
              imobiliaria_id: imob.id,
              lead_id: lead.id,
              corretor_id: corretor?.id || null,
              direction: 'outbound',
              message_text: msg2h,
              is_bot: true
            });

            await supabaseAdmin
              .from('eventos')
              .update({ reminder_2h_sent: true })
              .eq('id', evt.id);

            totalVisit2h++;
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      notified: totalNotified,
      escalated: totalEscalated,
      visit_reminders_24h: totalVisit24h,
      visit_reminders_2h: totalVisit2h
    });

  } catch (error: any) {
    console.error('❌ Erro no Cron de Lembretes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
