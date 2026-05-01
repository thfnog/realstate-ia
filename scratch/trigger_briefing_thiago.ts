import { supabaseAdmin } from '../src/lib/supabase';
import { sendWhatsAppMessage } from '../src/lib/whatsapp';
import { getConfigByCode } from '../src/lib/countryConfig';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

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

function formatBriefingMessage(corretor: any, data: any, config: any) {
  const saudacao = config.code === 'PT' ? 'Bom dia' : 'Bom dia';
  
  let msg = `☀️ *${saudacao}, ${corretor.nome}!* \n`;
  msg += `Aqui está o seu resumo diário da *ImobIA*:\n\n`;

  if (data.newLeads.length > 0) {
    msg += `🚀 *Novos Leads (Pendente):* ${data.newLeads.length}\n`;
    data.newLeads.slice(0, 3).forEach((l: any) => msg += `  - ${l.nome}\n`);
    if (data.newLeads.length > 3) msg += `  ...e mais ${data.newLeads.length - 3}\n`;
    msg += `\n`;
  } else {
    msg += `✅ *Nenhum lead novo pendente.* Bom trabalho!\n\n`;
  }

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

async function testManualBriefing() {
  console.log('🔍 Buscando corretor Thiago...');
  const { data: corretores, error } = await supabaseAdmin
    .from('corretores')
    .select('*, imobiliarias(*)')
    .ilike('nome', '%thiago%');

  if (error || !corretores || corretores.length === 0) {
    console.error('❌ Corretor não encontrado:', error);
    return;
  }

  const corretor = corretores[0];
  const imob = corretor.imobiliarias;
  const config = getConfigByCode(imob.config_pais);

  console.log(`📊 Coletando dados para ${corretor.nome} (Imob: ${imob.nome_fantasia})...`);
  const briefingData = await collectCorretorBriefing(imob.id, corretor.id);
  
  const message = formatBriefingMessage(corretor, briefingData, config);
  console.log('✉️ Mensagem formatada:\n', message);

  if (corretor.telefone) {
    console.log(`📱 Enviando para ${corretor.telefone}...`);
    const result = await sendWhatsAppMessage(
      corretor.telefone,
      message,
      corretor.whatsapp_instance || process.env.WHATSAPP_DEFAULT_INSTANCE || '',
      imob.config_pais
    );
    console.log('✅ Resultado:', result);
  } else {
    console.warn('⚠️ Corretor sem telefone cadastrado.');
  }
}

testManualBriefing();
