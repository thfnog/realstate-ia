const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('🔍 Buscando Thiago...');
  const { data: corretores } = await supabase
    .from('corretores')
    .select('*, imobiliarias(*)')
    .ilike('nome', '%thiago%');

  if (!corretores || corretores.length === 0) {
    console.log('❌ Não encontrado.');
    return;
  }

  const corretor = corretores[0];
  const imob = corretor.imobiliarias;
  const phone = corretor.telefone;

  if (!phone) {
    console.log('❌ Sem telefone.');
    return;
  }

  console.log(`📊 Thiago encontrado. Fone: ${phone}. Imob: ${imob.nome_fantasia}`);

  // Coletar dados
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const { data: newLeads } = await supabase.from('leads').select('nome').eq('corretor_id', corretor.id).eq('status', 'novo');
  const { data: agenda } = await supabase.from('eventos').select('titulo, data_hora, tipo').eq('corretor_id', corretor.id).gte('data_hora', startOfDay).lte('data_hora', endOfDay).eq('status', 'agendado');
  const { data: stats } = await supabase.from('leads').select('status').eq('corretor_id', corretor.id).in('status', ['em_atendimento', 'visita_agendada', 'negociacao']);

  const counts = (stats || []).reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});

  // Formatar
  let msg = `☀️ *Bom dia, ${corretor.nome}!* \n`;
  msg += `Aqui está o seu resumo diário da *ImobIA* (Teste Manual):\n\n`;

  if (newLeads && newLeads.length > 0) {
    msg += `🚀 *Novos Leads (Pendente):* ${newLeads.length}\n`;
    newLeads.slice(0, 3).forEach(l => msg += `  - ${l.nome}\n`);
    msg += `\n`;
  } else {
    msg += `✅ *Nenhum lead novo pendente.*\n\n`;
  }

  if (agenda && agenda.length > 0) {
    msg += `📅 *Agenda de Hoje:*\n`;
    agenda.forEach(e => {
      const hora = new Date(e.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      msg += `  • ${hora} - ${e.titulo}\n`;
    });
    msg += `\n`;
  } else {
    msg += `📭 *Sem eventos para hoje.*\n\n`;
  }

  msg += `📈 *Resumo da Carteira:* \n`;
  msg += `  - Atendimento: ${counts['em_atendimento'] || 0}\n`;
  msg += `  - Visitas: ${counts['visita_agendada'] || 0}\n`;
  msg += `  - Negociação: ${counts['negociacao'] || 0}\n`;

  msg += `\nBoas vendas! 🏆`;

  console.log('✉️ Mensagem:\n', msg);

  const evolutionUrl = process.env.EVOLUTION_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  // Usando instância que está OPEN para o teste
  const instance = 'realstate-iabroker-ca73d54c-72d8-4801-8d27-b4184213a4d3'; 

  let targetPhone = phone;
  if (targetPhone.length === 11 && !targetPhone.startsWith('55')) {
    targetPhone = '55' + targetPhone;
  }

  console.log(`📱 Disparando para ${targetPhone} via Evolution [${instance}]...`);
  
  try {
    const response = await axios.post(`${evolutionUrl}/message/sendText/${instance}`, {
      number: targetPhone,
      text: msg
    }, {
      headers: { 'apikey': apiKey }
    });
    console.log('✅ Sucesso!', response.data);
  } catch (err) {
    console.error('❌ Falha no envio:', err.response?.data || err.message);
  }
}

run();
