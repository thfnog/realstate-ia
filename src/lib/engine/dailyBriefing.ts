import { supabaseAdmin } from '@/lib/supabase';
import { Corretor, Lead, Evento, Imobiliaria } from '@/lib/database.types';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { getConfigByCode } from '@/lib/countryConfig';

export async function runDailyBriefing() {
  console.log('📅 Iniciando processamento de Briefing Diário...');

  // 1. Buscar todas as imobiliárias com briefing ativo
  const { data: imobiliarias, error: imobError } = await supabaseAdmin
    .from('imobiliarias')
    .select('*')
    .eq('briefing_diario_ativo', true);

  if (imobError) {
    console.error('❌ Erro ao buscar imobiliárias para briefing:', imobError);
    return;
  }

  console.log(`📋 Encontradas ${imobiliarias?.length || 0} imobiliárias com briefing ativo.`);

  for (const imob of (imobiliarias || [])) {
    await processImobiliariaBriefing(imob);
  }
}

async function processImobiliariaBriefing(imob: Imobiliaria) {
  const config = getConfigByCode(imob.config_pais);
  
  // 2. Buscar todos os corretores ativos desta imobiliária
  const { data: corretores, error: corrError } = await supabaseAdmin
    .from('corretores')
    .select('*')
    .eq('imobiliaria_id', imob.id)
    .eq('ativo', true);

  if (corrError) {
    console.error(`❌ Erro ao buscar corretores da imobiliária ${imob.id}:`, corrError);
    return;
  }

  for (const corretor of (corretores || [])) {
    // 3. Coletar dados para o briefing do corretor
    const briefingData = await collectCorretorBriefing(imob.id, corretor.id);
    
    // 4. Montar a mensagem
    const message = formatBriefingMessage(corretor, briefingData, config);
    
    // 5. Enviar via WhatsApp (se houver instância e preferência)
    if (corretor.pref_notif_whatsapp && corretor.telefone) {
      try {
        console.log(`📱 Enviando briefing para ${corretor.nome}...`);
        await sendWhatsAppMessage(
          corretor.telefone,
          message,
          corretor.whatsapp_instance || process.env.WHATSAPP_DEFAULT_INSTANCE || '',
          imob.config_pais
        );
      } catch (err) {
        console.error(`❌ Falha ao enviar briefing para ${corretor.nome}:`, err);
      }
    }
  }
}

async function collectCorretorBriefing(imobId: string, corretorId: string) {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  // a. Leads Novos (pendentes)
  const { data: newLeads } = await supabaseAdmin
    .from('leads')
    .select('id, nome')
    .eq('imobiliaria_id', imobId)
    .eq('corretor_id', corretorId)
    .eq('status', 'novo');

  // b. Agenda de Hoje
  const { data: agendaHoje } = await supabaseAdmin
    .from('eventos')
    .select('titulo, data_hora, tipo')
    .eq('imobiliaria_id', imobId)
    .eq('corretor_id', corretorId)
    .gte('data_hora', startOfDay)
    .lte('data_hora', endOfDay)
    .eq('status', 'agendado');

  // c. Resumo da Carteira
  const { data: stats } = await supabaseAdmin
    .from('leads')
    .select('status')
    .eq('imobiliaria_id', imobId)
    .eq('corretor_id', corretorId)
    .in('status', ['em_atendimento', 'visita_agendada', 'negociacao']);

  const counts = stats?.reduce((acc: any, lead: any) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});

  return {
    newLeads: newLeads || [],
    agenda: agendaHoje || [],
    stats: counts || {}
  };
}

function formatBriefingMessage(corretor: Corretor, data: any, config: any) {
  const saudacao = config.code === 'PT' ? 'Bom dia' : 'Bom dia';
  const consultorLabel = config.code === 'PT' ? 'Consultor' : 'Corretor';
  
  let msg = `☀️ *${saudacao}, ${corretor.nome}!* \n`;
  msg += `Aqui está o seu resumo diário da *ImobIA*:\n\n`;

  // Seção: Leads Novos
  if (data.newLeads.length > 0) {
    msg += `🚀 *Novos Leads (Pendente):* ${data.newLeads.length}\n`;
    data.newLeads.slice(0, 3).forEach((l: any) => msg += `  - ${l.nome}\n`);
    if (data.newLeads.length > 3) msg += `  ...e mais ${data.newLeads.length - 3}\n`;
    msg += `\n`;
  } else {
    msg += `✅ *Nenhum lead novo pendente.* Bom trabalho!\n\n`;
  }

  // Seção: Agenda
  if (data.agenda.length > 0) {
    msg += `📅 *Agenda de Hoje:*\n`;
    data.agenda.forEach((e: any) => {
      const hora = new Date(e.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      msg += `  • ${hora} - ${e.titulo} (${e.tipo})\n`;
    });
    msg += `\n`;
  } else {
    msg += `📭 *Sem eventos agendados para hoje.*\n\n`;
  }

  // Seção: Carteira
  const totalAtivos = (data.stats['em_atendimento'] || 0) + (data.stats['visita_agendada'] || 0) + (data.stats['negociacao'] || 0);
  if (totalAtivos > 0) {
    msg += `📈 *Evolução da Carteira:* \n`;
    if (data.stats['em_atendimento']) msg += `  - Em atendimento: ${data.stats['em_atendimento']}\n`;
    if (data.stats['visita_agendada']) msg += `  - Visitas marcadas: ${data.stats['visita_agendada']}\n`;
    if (data.stats['negociacao']) msg += `  - Em negociação: ${data.stats['negociacao']}\n`;
  }

  msg += `\nBoas vendas e um excelente dia! 🏆`;

  return msg;
}
