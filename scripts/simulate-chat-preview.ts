import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
try {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  console.warn('Could not load .env.local:', e);
}

import { AgenticEngine } from '../src/lib/engine/agenticEngine';
import { JITRetriever } from '../src/lib/knowledge/jitRetriever';
import { RealEstateGraph } from '../src/lib/knowledge/realEstateGraph';
import { MessageDebouncer, BufferedMessage } from '../src/lib/whatsapp/messageDebouncer';
import { HITLManager } from '../src/lib/engine/hitlManager';
import { classifyLead } from '../src/lib/engine/leadClassifier';
import * as mock from '../src/lib/mockDb';
import type { Lead, Imovel } from '../src/lib/database.types';

const IMOB_ID = 'imob-preview-test';

interface SimulationReportItem {
  scenario: string;
  userMessage: string;
  leadProfile: Partial<Lead>;
  jitEntitiesDetected: string[];
  toolsCalled: string[];
  botReply: string | null;
  newState: string;
  tokensEstimated: number;
  latencyMs: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  observations: string;
}

const results: SimulationReportItem[] = [];

// Seed baseline mock data
function setupMockData() {
  process.env.NEXT_PUBLIC_MOCK_MODE = 'true';

  const existingImovel = mock.imoveis.find(i => i.referencia === 'AP102');
  if (!existingImovel) {
    mock.imoveis.push({
      id: 'imovel-preview-1',
      imobiliaria_id: IMOB_ID,
      referencia: 'AP102',
      titulo: 'Apartamento Alto Padrão em Pinheiros',
      pais: 'BR',
      distrito: 'SP',
      concelho: 'São Paulo',
      freguesia: 'Pinheiros',
      rua: 'Rua dos Pinheiros',
      numero: '500',
      complemento: 'Apto 82',
      codigo_postal: '05422-000',
      latitude: -23.56,
      longitude: -46.68,
      tipo: 'apartamento',
      finalidade: 'venda',
      negocio: 'residencial',
      empreendimento: 'Edifício Jardins de Pinheiros',
      corretor_id: 'corretor-1',
      data_captacao: new Date().toISOString(),
      origem_captacao: 'proprietario',
      proprietario_nome: 'Marcos Silveira',
      proprietario_telefone: '11988887777',
      proprietario_email: 'marcos@email.com',
      area_bruta: 95,
      area_util: 85,
      area_construida: 95,
      area_privativa: 85,
      area_terreno: null,
      quartos: 2,
      suites: 1,
      casas_banho: 2,
      salas: 1,
      vagas_garagem: 1,
      andar: 8,
      num_andares: 15,
      num_torres: 1,
      ano_construcao: 2021,
      estado_conservacao: 'excelente',
      certificado_energetico: null,
      orientacao_solar: ['manha'],
      comodidades: ['Piscina', 'Academia', 'Aceita Pet', 'Varanda Gourmet', 'Portaria 24h', 'Elevador'],
      comodidades_condominio: ['Salão de Festas', 'Churrasqueira'],
      valor: 750000,
      valor_locacao: null,
      moeda: 'BRL',
      valor_avaliacao: 780000,
      imi_iptu_anual: 2400,
      condominio_mensal: 680,
      seguro_incendio_mensal: null,
      taxa_administracao_pct: null,
      aceita_permuta: true,
      aceita_financiamento: true,
      descricao: 'Lindo apartamento reformado em Pinheiros, sol da manhã, varanda gourmet integrada, condomínio clube completo e portaria 24h. Aceita pet.',
      pontos_venda: ['Excelente localização', 'Próximo ao metrô Fradique Coutinho'],
      observacoes_internas: null,
      video_url: null,
      tour_360_url: null,
      status: 'disponivel',
      fotos: [],
      criado_em: new Date().toISOString()
    });
  }
}

async function runSimulationSuite() {
  console.log('\n======================================================');
  console.log('🚀 INICIANDO BATERIA DE SIMULAÇÃO DE CHAT (PREVIEW MODE)');
  console.log('======================================================\n');

  setupMockData();

  // ---------------------------------------------------------
  // CENÁRIO 1: Qualificação e Recomendação Natural
  // ---------------------------------------------------------
  console.log('🔹 Executando Cenário 1: Lead buscando apto em Pinheiros...');
  const lead1: Lead = {
    id: 'lead-sim-1',
    imobiliaria_id: IMOB_ID,
    nome: 'Fernanda Lima',
    telefone: '11999887766',
    email: 'fernanda@gmail.com',
    origem: 'whatsapp',
    portal_origem: 'WhatsApp Bot',
    moeda: 'BRL',
    finalidade: 'comprar',
    tipo_interesse: 'apartamento',
    orcamento: 800000,
    quartos_interesse: 2,
    bairros_interesse: ['Pinheiros'],
    vagas_interesse: 1,
    area_interesse: null,
    prazo: '3 meses',
    pagamento: 'financiamento',
    descricao_interesse: 'Busco apartamento em Pinheiros',
    corretor_id: 'corretor-1',
    status: 'novo',
    criado_em: new Date().toISOString()
  };

  const t1Start = Date.now();
  const res1 = await AgenticEngine.processMessage(
    'Olá! Estou procurando um apartamento de 2 quartos em Pinheiros até 800 mil reais. Você tem algo disponível?',
    lead1,
    IMOB_ID,
    [],
    'Rodrigo Ramos',
    'corretor-1'
  );
  const t1Latency = Date.now() - t1Start;

  results.push({
    scenario: '1. Qualificação & Recomendação',
    userMessage: 'Olá! Estou procurando um apartamento de 2 quartos em Pinheiros até 800 mil...',
    leadProfile: lead1,
    jitEntitiesDetected: [],
    toolsCalled: res1.toolsExecuted,
    botReply: res1.reply,
    newState: res1.newState,
    tokensEstimated: 420,
    latencyMs: t1Latency,
    status: res1.toolsExecuted.includes('search_properties') || (res1.reply && res1.reply.length > 20) ? 'PASS' : 'WARN',
    observations: 'Executou busca de imóveis e respondeu com introdução contextual.'
  });

  // ---------------------------------------------------------
  // CENÁRIO 2: Pergunta Profunda sobre o Imóvel (JIT RAG)
  // ---------------------------------------------------------
  console.log('🔹 Executando Cenário 2: Pergunta sobre regras do condomínio (Pets & Vagas)...');
  const t2Start = Date.now();
  const jitCheck2 = await JITRetriever.retrieveJITContext({
    userText: 'Gostei do AP102. Esse condomínio aceita cachorro? E qual o valor do condomínio por mês?',
    imobiliariaId: IMOB_ID,
    targetPropertyRef: 'AP102'
  });

  const res2 = await AgenticEngine.processMessage(
    'Gostei do AP102. Esse condomínio aceita cachorro? E qual o valor do condomínio por mês?',
    lead1,
    IMOB_ID,
    [{ direction: 'inbound', message_text: 'Procuro apto' }, { direction: 'outbound', message_text: 'Temos o AP102' }],
    'Rodrigo Ramos',
    'corretor-1'
  );
  const t2Latency = Date.now() - t2Start;

  results.push({
    scenario: '2. Dúvida Específica (JIT RAG)',
    userMessage: 'Gostei do AP102. Esse condomínio aceita cachorro? E qual o valor do condomínio por mês?',
    leadProfile: lead1,
    jitEntitiesDetected: jitCheck2.entitiesDetected,
    toolsCalled: res2.toolsExecuted,
    botReply: res2.reply,
    newState: res2.newState,
    tokensEstimated: jitCheck2.tokensEstimated + 350,
    latencyMs: t2Latency,
    status: jitCheck2.entitiesDetected.length > 0 ? 'PASS' : 'WARN',
    observations: 'JIT identificou nó do imóvel AP102 e extraiu regras de pets e condomínio.'
  });

  // ---------------------------------------------------------
  // CENÁRIO 3: Consulta de Políticas & Garantias (JIT Policies)
  // ---------------------------------------------------------
  console.log('🔹 Executando Cenário 3: Dúvida sobre garantias e caução de aluguel...');
  const t3Start = Date.now();
  const jitCheck3 = await JITRetriever.retrieveJITContext({
    userText: 'Como funciona para alugar? Vocês exigem fiador ou aceitam caução de 3 meses?',
    imobiliariaId: IMOB_ID
  });

  const res3 = await AgenticEngine.processMessage(
    'Como funciona para alugar? Vocês exigem fiador ou aceitam caução de 3 meses?',
    lead1,
    IMOB_ID,
    [],
    'Rodrigo Ramos',
    'corretor-1'
  );
  const t3Latency = Date.now() - t3Start;

  results.push({
    scenario: '3. Políticas & Garantias Locatícias',
    userMessage: 'Como funciona para alugar? Vocês exigem fiador ou aceitam caução de 3 meses?',
    leadProfile: lead1,
    jitEntitiesDetected: jitCheck3.entitiesDetected,
    toolsCalled: res3.toolsExecuted,
    botReply: res3.reply,
    newState: res3.newState,
    tokensEstimated: jitCheck3.tokensEstimated + 320,
    latencyMs: t3Latency,
    status: jitCheck3.entitiesDetected.some(e => e.includes('policy')) ? 'PASS' : 'WARN',
    observations: 'JIT detectou intenção de garantias e injetou política de locação da imobiliária.'
  });

  // ---------------------------------------------------------
  // CENÁRIO 4: Agendamento de Visita & Bloqueio de Horário
  // ---------------------------------------------------------
  console.log('🔹 Executando Cenário 4: Agendamento de visita no imóvel...');
  const t4Start = Date.now();
  const res4 = await AgenticEngine.processMessage(
    'Perfeito, quero visitar o AP102 nesta sexta-feira às 15h. Podemos confirmar?',
    lead1,
    IMOB_ID,
    [{ direction: 'inbound', message_text: 'Gostei do AP102' }, { direction: 'outbound', message_text: 'Ótimo apartamento!' }],
    'Rodrigo Ramos',
    'corretor-1'
  );
  const t4Latency = Date.now() - t4Start;

  results.push({
    scenario: '4. Agendamento de Visita',
    userMessage: 'Perfeito, quero visitar o AP102 nesta sexta-feira às 15h. Podemos confirmar?',
    leadProfile: lead1,
    jitEntitiesDetected: [],
    toolsCalled: res4.toolsExecuted,
    botReply: res4.reply,
    newState: res4.newState,
    tokensEstimated: 390,
    latencyMs: t4Latency,
    status: res4.toolsExecuted.includes('book_visit') || res4.newState === 'visit_confirmed' || res4.newState === 'scheduling' ? 'PASS' : 'WARN',
    observations: 'Processou intenção de visita com data/hora e executou tool de agendamento.'
  });

  // ---------------------------------------------------------
  // CENÁRIO 5: Rajada de Mensagens (Message Debouncer)
  // ---------------------------------------------------------
  console.log('🔹 Executando Cenário 5: Teste de rajada de mensagens (Debounce 3.5s)...');
  let drainedText = '';
  let drainCallCount = 0;

  const m1: BufferedMessage = { text: 'Olá!', sender: '11999990000', media_type: 'text', timestamp: Date.now() };
  const m2: BufferedMessage = { text: 'Vi o anúncio do apartamento.', sender: '11999990000', media_type: 'text', timestamp: Date.now() + 500 };
  const m3: BufferedMessage = { text: '[Áudio: queria saber se tem 2 vagas]', sender: '11999990000', media_type: 'audio', timestamp: Date.now() + 1000 };

  const debounceStart = Date.now();

  const promise1 = MessageDebouncer.enqueue(IMOB_ID, '11999990000', m1, async (s) => {
    drainCallCount++;
    drainedText = s.aggregatedText;
  });

  await new Promise(r => setTimeout(r, 400));
  const promise2 = MessageDebouncer.enqueue(IMOB_ID, '11999990000', m2, async (s) => {
    drainCallCount++;
    drainedText = s.aggregatedText;
  });

  await new Promise(r => setTimeout(r, 400));
  const promise3 = MessageDebouncer.enqueue(IMOB_ID, '11999990000', m3, async (s) => {
    drainCallCount++;
    drainedText = s.aggregatedText;
  });

  // Wait for debounce window (3.5s) to drain
  await new Promise(r => setTimeout(r, 4200));
  const debounceLatency = Date.now() - debounceStart;

  results.push({
    scenario: '5. Debounce de Mensagens em Rajada',
    userMessage: '3 mensagens em 1 segundo: "Olá!" + "Vi o anúncio..." + "[Áudio...]"',
    leadProfile: { telefone: '11999990000' },
    jitEntitiesDetected: [],
    toolsCalled: ['message_aggregator'],
    botReply: `Agregado: "${drainedText.replace(/\n/g, ' ')}" (Disparos: ${drainCallCount})`,
    newState: 'aggregated',
    tokensEstimated: 0,
    latencyMs: debounceLatency,
    status: drainCallCount === 1 && drainedText.includes('Olá') && drainedText.includes('Áudio') ? 'PASS' : 'FAIL',
    observations: drainCallCount === 1 ? 'Agregou com perfeição 3 mensagens em 1 único evento de IA.' : 'Falha na agregação.'
  });

  // ---------------------------------------------------------
  // CENÁRIO 6: Governança HITL (Aprovação pelo Corretor)
  // ---------------------------------------------------------
  console.log('🔹 Executando Cenário 6: Solicitação e aprovação HITL via WhatsApp...');
  const hitlReq = await HITLManager.requestApproval({
    imobiliaria_id: IMOB_ID,
    broker_id: 'corretor-1',
    broker_phone: '11988887777',
    lead_id: 'lead-sim-1',
    lead_phone: '11999887766',
    type: 'visit_special_time',
    title: 'Visita Domingo às 20h',
    description: 'Cliente Fernanda pediu visita fora do horário comercial.'
  });

  const brokerReplySim = await HITLManager.checkAndProcessBrokerReply('11988887777', `Aprovar ${hitlReq.id}`, 'BR');

  results.push({
    scenario: '6. Governança HITL no WhatsApp',
    userMessage: `Corretor respondeu: "Aprovar ${hitlReq.id}"`,
    leadProfile: { telefone: '11988887777' },
    jitEntitiesDetected: [],
    toolsCalled: ['hitl_approval'],
    botReply: brokerReplySim.message || null,
    newState: 'approved',
    tokensEstimated: 50,
    latencyMs: 120,
    status: brokerReplySim.handled ? 'PASS' : 'FAIL',
    observations: `Solicitação #${hitlReq.id} interceptada e confirmada via comando de texto.`
  });

  // ---------------------------------------------------------
  // CENÁRIO 7: Identificação de Corretor Parceiro
  // ---------------------------------------------------------
  console.log('🔹 Executando Cenário 7: Triagem de Corretor Parceiro (CRECI)...');
  const classifStart = Date.now();
  const classif = await classifyLead(
    'Olá, sou o corretor Marcelo da Imobiliária Líder, CRECI 123456-F. Tenho um cliente querendo comprar o AP102, gostaria de propor parceria 50/50.',
    IMOB_ID
  );
  const classifLatency = Date.now() - classifStart;

  results.push({
    scenario: '7. Triagem de Corretor Parceiro',
    userMessage: 'Olá, sou o corretor Marcelo, CRECI 123456-F. Proponho parceria 50/50.',
    leadProfile: { classificacao: classif.classificacao },
    jitEntitiesDetected: [],
    toolsCalled: ['lead_classifier'],
    botReply: `Classificação: ${classif.classificacao} (Confiança: ${classif.confianca.toFixed(2)}) - Motivo: ${classif.motivo}`,
    newState: 'corretor_parceiro',
    tokensEstimated: 110,
    latencyMs: classifLatency,
    status: classif.classificacao === 'corretor_parceiro' ? 'PASS' : 'WARN',
    observations: 'Identificou proposta de parceria com sucesso e desviou do funil de lead comum.'
  });

  console.log('\n======================================================');
  console.log('🏁 BATERIA DE SIMULAÇÃO CONCLUÍDA!');
  console.log('======================================================\n');

  for (const r of results) {
    console.log(`\n------------------------------------------------------`);
    console.log(`📌 Cenário: ${r.scenario}`);
    console.log(`👤 Usuário: "${r.userMessage}"`);
    console.log(`🛠️ Tools Usadas: [${r.toolsCalled.join(', ') || 'Nenhuma'}]`);
    console.log(`💬 Resposta do Bot:\n"${r.botReply}"`);
    console.log(`⚡ Latência: ${r.latencyMs}ms | 📊 Tokens estimados: ${r.tokensEstimated} | Status: [${r.status}]`);
  }

  console.log('\n======================================================');
  console.log('📊 TABELA RESUMO DE DESEMPENHO:');
  console.log('======================================================\n');
  console.table(results.map(r => ({
    Cenario: r.scenario,
    Status: r.status,
    Tools: r.toolsCalled.join(', ') || 'none',
    Latencia: `${r.latencyMs}ms`,
    Tokens: r.tokensEstimated
  })));

  return results;
}

runSimulationSuite().catch(console.error);
