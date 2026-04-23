import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { sendSlackNotification } from '@/lib/slack';

export const maxDuration = 300; // 5 minutes
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

    // 1. Buscar imobiliárias e suas configurações
    const { data: imobs, error: imobError } = await supabaseAdmin
      .from('imobiliarias')
      .select('id, nome_fantasia, config_lembrete_1_horas, config_lembrete_2_horas, config_pais');

    if (imobError) throw imobError;

    let totalNotified = 0;
    let totalEscalated = 0;

    for (const imob of imobs) {
      const l1_hours = imob.config_lembrete_1_horas || 24;
      const l2_hours = imob.config_lembrete_2_horas || 48; // Usando 48 como fallback para L2 se for maior

      // 2. Buscar leads "novos" ou "em_atendimento" sem interação recente
      // Para simplificar, vamos focar em leads 'novo' que não tiveram o primeiro lembrete
      const { data: leads, error: leadError } = await supabaseAdmin
        .from('leads')
        .select('*, corretores(*)')
        .eq('imobiliaria_id', imob.id)
        .eq('status', 'novo')
        .is('lembrete_1_enviado_em', null);

      if (leadError) {
        console.error(`Erro ao buscar leads da imobiliária ${imob.id}:`, leadError);
        continue;
      }

      for (const lead of leads) {
        const criadoEm = new Date(lead.criado_em);
        const diffHours = (now.getTime() - criadoEm.getTime()) / (1000 * 60 * 60);

        if (diffHours >= l1_hours) {
          console.log(`🔔 Enviando Lembrete 1 para Lead: ${lead.nome} (Atraso: ${diffHours.toFixed(1)}h)`);
          
          const corretor = lead.corretores;
          if (corretor && corretor.ativo) {
            const msg = `⏰ *LEMBRETE DE ATENDIMENTO*\n\nO lead *${lead.nome}* (${lead.telefone}) entrou há ${Math.round(diffHours)}h e ainda está com status *Novo*.\n\nPor favor, inicie o atendimento o quanto antes para não perder a oportunidade! 🚀`;
            
            const instance = corretor.whatsapp_instance || `realstate-iabroker-${corretor.id}`;
            await sendWhatsAppMessage(corretor.telefone, msg, instance, imob.config_pais);
            
            // Marcar como enviado
            await supabaseAdmin
              .from('leads')
              .update({ lembrete_1_enviado_em: now.toISOString() })
              .eq('id', lead.id);
            
            totalNotified++;
          }
        }
      }

      // 3. Escalonação (Lembrete 2 - Slack)
      // Leads que já receberam L1 e continuam 'novo' após L2 horas adicionais
      const { data: leadsL2, error: leadError2 } = await supabaseAdmin
        .from('leads')
        .select('*, corretores(*)')
        .eq('imobiliaria_id', imob.id)
        .eq('status', 'novo')
        .not('lembrete_1_enviado_em', 'is', null)
        .is('lembrete_2_enviado_em', null);

      if (!leadError2) {
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
    }

    return NextResponse.json({ 
      success: true, 
      notified: totalNotified,
      escalated: totalEscalated
    });

  } catch (error: any) {
    console.error('❌ Erro no Cron de Lembretes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
