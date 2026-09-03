import { supabaseAdmin } from '@/lib/supabase';
import { isMockMode } from '@/lib/mockDb';
import * as mockDb from '@/lib/mockDb';
import { callAIWithFallback } from '@/lib/engine/aiUtils';
import { sendWhatsAppMessage, saveMessageToHistory } from '@/lib/whatsapp';
import { formatCurrency, formatQuartos, getConfigByCode, CountryCode } from '@/lib/countryConfig';
import type { Lead, Imovel, Corretor } from '@/lib/database.types';

export interface ReactivationOpportunity {
  id: string; // Opportunity id
  lead: Lead;
  corretor: Corretor | null;
  imovelSugerido: Imovel | null;
  diasSemContato: number;
  motivoReativacao: string;
  mensagemSugerida: string;
  status: 'pendente' | 'enviado' | 'descartado';
}

/**
 * Calculates days of inactivity based on criado_em or last message date
 */
function calculateDaysInactive(dateStr: string): number {
  if (!dateStr) return 30;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Matches a lead with candidate properties based on preferences
 */
function findBestMatchingProperty(lead: Lead, imoveis: Imovel[]): { imovel: Imovel | null; score: number } {
  let bestImovel: Imovel | null = null;
  let bestScore = -1;

  for (const imovel of imoveis) {
    if (imovel.status !== 'disponivel') continue;
    let score = 0;

    // 1. Match Bairro / Freguesia
    if (lead.bairros_interesse && lead.bairros_interesse.length > 0) {
      const matchBairro = lead.bairros_interesse.some(b => 
        imovel.freguesia?.toLowerCase().includes(b.toLowerCase()) || 
        imovel.concelho?.toLowerCase().includes(b.toLowerCase()) ||
        b.toLowerCase().includes(imovel.freguesia?.toLowerCase() || '')
      );
      if (matchBairro) score += 40;
    }

    // 2. Match Tipo
    if (lead.tipo_interesse) {
      if (imovel.tipo?.toLowerCase() === lead.tipo_interesse.toLowerCase()) {
        score += 25;
      }
    }

    // 3. Match Orçamento (+/- 25%)
    if (lead.orcamento && lead.orcamento > 0 && imovel.valor > 0) {
      const minVal = lead.orcamento * 0.75;
      const maxVal = lead.orcamento * 1.25;
      if (imovel.valor >= minVal && imovel.valor <= maxVal) {
        score += 20;
      }
    }

    // 4. Match Quartos
    if (lead.quartos_interesse && imovel.quartos) {
      if (imovel.quartos >= lead.quartos_interesse) {
        score += 15;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestImovel = imovel;
    }
  }

  return { imovel: bestScore >= 20 ? bestImovel : null, score: bestScore };
}

/**
 * Generates hyper-personalized WhatsApp reactivation copy using AI
 */
export async function generateReactivationMessage(options: {
  lead: Lead;
  imovel?: Imovel | null;
  corretor?: Corretor | null;
  config_pais: CountryCode;
  customContext?: string;
}): Promise<string> {
  const { lead, imovel, corretor, config_pais, customContext } = options;
  const config = getConfigByCode(config_pais);
  const leadName = lead.nome ? lead.nome.split(' ')[0] : 'Cliente';
  const corretorName = corretor?.nome || 'Seu Consultor Imobiliário';

  const systemPrompt = `Você é um especialista em vendas imobiliárias e comunicação via WhatsApp no mercado imobiliário (${config.label}).
Sua missão é gerar UMA ÚNICA MENSAGEM CURTA, AMIGÁVEL e CONSULTIVA para reativar um cliente que está sem contato recente.

REGRAS OBRIGATÓRIAS:
- Tom: Humano, atencioso, caloroso, natural e NÃO robótico.
- Canal: WhatsApp. Use emojis leves e quebras de linha limpas.
- NUNCA pareça vendedor chato de telemarketing. Pareça um consultor prestativo que realmente se lembrou do perfil do cliente.
- Mencione o primeiro nome do cliente: "${leadName}".
- País de referência: ${config.label}. Use moeda "${config.currency.symbol}".
- Se houver imóvel recomendado, cite o bairro, tipo e o valor formatado de forma atraente.
- Finalize com uma pergunta aberta e leve de engajamento (ex: "Quer que eu te envie o link com fotos?", "Como estão seus planos para mudar?").
- Retorne APENAS o texto da mensagem final, sem aspas e sem explicações antes ou depois.`;

  const userPrompt = `DADOS DO CLIENTE:
- Nome: ${lead.nome}
- Status atual: ${lead.status}
- Finalidade: ${lead.finalidade || 'Não especificada'}
- Tipo de imóvel buscado: ${lead.tipo_interesse || 'Não especificado'}
- Bairros de interesse: ${lead.bairros_interesse?.join(', ') || 'Geral'}
- Orçamento estimado: ${lead.orcamento ? formatCurrency(lead.orcamento, config) : 'Não informado'}
- Descrição prévia: ${lead.descricao_interesse || 'Sem histórico detalhado'}

${imovel ? `NOVO IMÓVEL ENCONTRADO (OPORTUNIDADE DE REPIQUE):
- Título: ${imovel.titulo}
- Tipo: ${imovel.tipo}
- Localização/Bairro: ${imovel.freguesia || imovel.concelho}
- Quartos: ${formatQuartos(imovel.quartos || 0, config)}
- Valor: ${formatCurrency(imovel.valor, config)}
` : `Sem imóvel específico selecionado. Faça uma abordagem consultiva perguntando sobre o momento de compra/locação.`}

${customContext ? `INSTRUÇÕES ADICIONAIS: ${customContext}` : ''}
Corretor assinante: ${corretorName}`;

  try {
    const aiResponse = await callAIWithFallback({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      imobiliaria_id: lead.imobiliaria_id,
      feature: 'lead_reactivation'
    });

    const reply = aiResponse.choices?.[0]?.message?.content?.trim();
    if (reply) return reply;
  } catch (err) {
    console.error('❌ Falha na geração de mensagem com IA:', err);
  }

  // Fallback template
  if (imovel) {
    return `Oi ${leadName}, tudo bem? Lembrei de você porque acabou de surgir uma excelente oportunidade em ${imovel.freguesia || 'uma ótima região'}: ${imovel.titulo}, por ${formatCurrency(imovel.valor, config)}.\n\nQuer que eu te envie as fotos e detalhes? 🏡`;
  }
  return `Oi ${leadName}, tudo bem? Faz um tempinho que não conversamos e queria saber se você ainda está procurando imóvel na região. Surgiram novidades no mercado essa semana! Como está sua busca? ✨`;
}

/**
 * Scans the database and identifies reactivation opportunities
 */
export async function findReactivationOpportunities(options: {
  imobiliaria_id: string;
  diasSemContato?: number;
  corretor_id?: string;
  config_pais?: CountryCode;
  limit?: number;
}): Promise<ReactivationOpportunity[]> {
  const { imobiliaria_id, diasSemContato = 15, corretor_id, config_pais = 'BR', limit = 20 } = options;

  let candidates: Lead[] = [];
  let availableProperties: Imovel[] = [];
  let brokersMap = new Map<string, Corretor>();

  if (isMockMode()) {
    mockDb.seedTestData();
    const allLeads = mockDb.getLeads();
    const allImoveis = mockDb.getImoveis();
    const allCorretores = mockDb.getCorretores(imobiliaria_id);
    allCorretores.forEach(c => brokersMap.set(c.id, c));

    availableProperties = allImoveis.filter(i => i.status === 'disponivel');

    candidates = allLeads.filter(lead => {
      if (lead.imobiliaria_id !== imobiliaria_id && imobiliaria_id !== mockDb.DEFAULT_IMOBILIARIA_ID) return false;
      if (corretor_id && lead.corretor_id !== corretor_id) return false;
      if (['fechado', 'descartado'].includes(lead.status)) return false;

      const daysInactive = calculateDaysInactive(lead.criado_em);
      return daysInactive >= diasSemContato || lead.status === 'sem_interesse' || lead.status === 'em_atendimento';
    });
  } else {
    // 1. Fetch brokers
    const { data: brokers } = await supabaseAdmin
      .from('corretores')
      .select('*')
      .eq('imobiliaria_id', imobiliaria_id);
    (brokers || []).forEach(c => brokersMap.set(c.id, c));

    // 2. Fetch available properties
    const { data: imoveis } = await supabaseAdmin
      .from('imoveis')
      .select('*')
      .eq('imobiliaria_id', imobiliaria_id)
      .eq('status', 'disponivel')
      .order('criado_em', { ascending: false })
      .limit(50);
    availableProperties = imoveis || [];

    // 3. Fetch candidate leads
    let query = supabaseAdmin
      .from('leads')
      .select('*')
      .eq('imobiliaria_id', imobiliaria_id)
      .not('status', 'in', '("fechado","descartado")');

    if (corretor_id) {
      query = query.eq('corretor_id', corretor_id);
    }

    const { data: leads, error } = await query;
    if (error) {
      console.error('❌ Erro ao buscar leads para reativação:', error);
      return [];
    }

    candidates = (leads || []).filter(lead => {
      const daysInactive = calculateDaysInactive(lead.criado_em);
      return daysInactive >= diasSemContato || lead.status === 'sem_interesse' || lead.status === 'em_atendimento';
    });
  }

  // Limit processing batch to avoid timeouts
  const selectedBatch = candidates.slice(0, limit);
  const opportunities: ReactivationOpportunity[] = [];

  for (const lead of selectedBatch) {
    const daysInactive = calculateDaysInactive(lead.criado_em);
    const corretor = lead.corretor_id ? brokersMap.get(lead.corretor_id) || null : null;
    const { imovel } = findBestMatchingProperty(lead, availableProperties);

    let motivo = `Sem interação há ${daysInactive} dias.`;
    if (lead.status === 'sem_interesse') {
      motivo = `Lead marcado como "Sem Interesse" há ${daysInactive} dias — oportunidade de novo contato com novo imóvel.`;
    } else if (imovel) {
      motivo = `Novo imóvel compatível no bairro ${imovel.freguesia || 'desejado'} (${imovel.titulo}).`;
    }

    const suggestedMsg = await generateReactivationMessage({
      lead,
      imovel,
      corretor,
      config_pais
    });

    opportunities.push({
      id: `reactivate-${lead.id}`,
      lead,
      corretor,
      imovelSugerido: imovel,
      diasSemContato: daysInactive,
      motivoReativacao: motivo,
      mensagemSugerida: suggestedMsg,
      status: 'pendente'
    });
  }

  return opportunities;
}

/**
 * Dispatches a reactivation message to a lead via WhatsApp
 */
export async function sendReactivationMessage(options: {
  lead_id: string;
  mensagem: string;
  imobiliaria_id: string;
  corretor_id?: string | null;
  config_pais?: CountryCode;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const { lead_id, mensagem, imobiliaria_id, corretor_id, config_pais = 'BR' } = options;

  let lead: any = null;
  let corretor: any = null;

  if (isMockMode()) {
    mockDb.seedTestData();
    lead = mockDb.getLeadById(lead_id) || null;
    if (corretor_id) corretor = mockDb.getCorretorById(corretor_id) || null;
  } else {
    const { data: lData } = await supabaseAdmin.from('leads').select('*, corretores(*)').eq('id', lead_id).single();
    lead = lData;
    if (lead?.corretores) corretor = lead.corretores;
  }

  if (!lead || !lead.telefone) {
    return { success: false, error: 'Lead não encontrado ou sem telefone' };
  }

  try {
    const instance = corretor?.whatsapp_instance || undefined;
    const sid = await sendWhatsAppMessage(lead.telefone, mensagem, instance, config_pais);

    // Save message in history
    await saveMessageToHistory({
      imobiliaria_id,
      lead_id: lead.id,
      corretor_id: corretor?.id || lead.corretor_id || null,
      direction: 'outbound',
      message_text: mensagem,
      is_bot: true
    });

    // Update lead status to 'em_atendimento'
    if (isMockMode()) {
      mockDb.updateLead(lead.id, { status: 'em_atendimento' });
      mockDb.createEvento({
        imobiliaria_id,
        lead_id: lead.id,
        corretor_id: corretor?.id || lead.corretor_id || null,
        tipo: 'outro',
        titulo: '⚡ Reativação de Carteira (IA)',
        descricao: `Mensagem de reativação enviada via WhatsApp: "${mensagem.slice(0, 100)}..."`,
        data_hora: new Date().toISOString(),
        local: null,
        status: 'realizado'
      });
    } else {
      await supabaseAdmin
        .from('leads')
        .update({ status: 'em_atendimento' })
        .eq('id', lead.id);

      await supabaseAdmin.from('eventos').insert([{
        imobiliaria_id,
        lead_id: lead.id,
        corretor_id: corretor?.id || lead.corretor_id || null,
        tipo: 'outro',
        titulo: '⚡ Reativação de Carteira (IA)',
        descricao: `Mensagem de reativação enviada via WhatsApp: "${mensagem.slice(0, 100)}..."`,
        data_hora: new Date().toISOString(),
        local: null,
        status: 'realizado'
      }]);
    }

    return { success: true, sid };
  } catch (err: any) {
    console.error(`❌ Erro ao enviar mensagem de reativação para ${lead.telefone}:`, err);
    return { success: false, error: err.message || 'Falha ao enviar mensagem' };
  }
}
