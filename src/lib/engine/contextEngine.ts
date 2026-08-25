/**
 * Real Estate Context Engine (Token-Budgeted Context Assembler)
 * Inspired by Enterprise Assistant Context Engine
 * 
 * Assembles multi-layered, prioritized prompt context just-in-time:
 *   Layer 1: Broker & Tenant Identity + Regionalization (BR/PT)
 *   Layer 2: Dynamic Lead Criteria & Memory
 *   Layer 3: Target Property Knowledge & Constraints
 *   Layer 4: Recent Dialog History
 */

import { getConfigByCode } from '@/lib/countryConfig';
import type { Lead, Imovel } from '@/lib/database.types';

export interface ContextBuildOptions {
  lead: Lead;
  brokerName?: string;
  config_pais?: 'PT' | 'BR';
  history?: Array<{ direction: 'inbound' | 'outbound'; message_text: string; criado_em?: string }>;
  targetProperty?: Imovel | null;
  recommendedProperties?: Imovel[];
  jitSnippet?: string;
  maxHistoryTurns?: number;
}

export interface BuiltContext {
  systemPrompt: string;
  leadSummary: string;
  propertyContext: string;
  historyText: string;
  totalTokensEstimated: number;
}

export class ContextEngine {
  /**
   * Fast token estimation (~1.35 tokens per whitespace-separated word in Portuguese)
   */
  static estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.trim().split(/\s+/).length * 1.35);
  }

  /**
   * Builds prioritized context string for the AI agent
   */
  static buildContext(options: ContextBuildOptions): BuiltContext {
    const {
      lead,
      brokerName = 'Corretor',
      config_pais = (lead.moeda === 'EUR' ? 'PT' : 'BR'),
      history = [],
      targetProperty = null,
      recommendedProperties = [],
      jitSnippet = '',
      maxHistoryTurns = 8
    } = options;

    const country = getConfigByCode(config_pais);
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];
    const weekdays = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const todayWeekday = weekdays[today.getDay()];

    // --- Layer 1: Persona & Regionalization Rules ---
    const layer1 = `
Você é o corretor ${brokerName}, conversando com o cliente no WhatsApp de forma humana, calorosa, profissional e SUCINTO.
Fale SEMPRE em 1ª pessoa ("Eu tenho", "Eu separei para você", "Posso te acompanhar na visita").
NUNCA diga que você é uma inteligência artificial, bot ou assistente virtual.

DATA DE HOJE: ${todayISO} (${todayWeekday})
REGIONALIZAÇÃO: ${country.flag} ${country.label} (Moeda: ${country.currency.symbol}, Termos: ${country.code === 'PT' ? 'Freguesia' : 'Bairro'}, ${country.terminology.corretor})

REGRAS DE OURO DE ATENDIMENTO:
- Frases curtas, diretas e naturais. Ninguém gosta de ler testão no WhatsApp.
- Seja assertivo e tenha escuta ativa: NUNCA pergunte uma informação que o cliente já disse na conversa ou que já consta no perfil dele.
- Se o cliente busca apartamento, NÃO pergunte se é condomínio fechado.
- Se o cliente perguntar detalhes de um imóvel (ex: condomínio, aceita pet, vaga, andar), use a ferramenta 'get_property_details' para responder com precisão.
- Se o cliente demonstrar interesse em visitar ou escolher um horário, consulte a agenda com 'check_available_slots' e confirme com 'book_visit'.
- Ao confirmar visita, sempre mencione o endereço completo do imóvel.
`;

    // --- Layer 2: Lead Criteria & Requirements ---
    const bairrosStr = (lead.bairros_interesse && lead.bairros_interesse.length > 0)
      ? lead.bairros_interesse.join(', ')
      : 'Não especificado';

    const orcamentoStr = lead.orcamento
      ? `${country.currency.symbol} ${lead.orcamento.toLocaleString('pt-BR')}`
      : 'Aberto / Não informado';

    const layer2 = `
DADOS ATUAIS DO CLIENTE:
- Nome: ${lead.nome || 'Cliente'}
- Telefone: ${lead.telefone}
- Finalidade: ${lead.finalidade || 'Não definida (Comprar/Alugar)'}
- Tipo de Imóvel: ${lead.tipo_interesse || 'Não especificado'}
- Orçamento: ${orcamentoStr}
- Quartos: ${lead.quartos_interesse ?? 'Não especificado'}
- ${country.code === 'PT' ? 'Freguesias' : 'Bairros'} de Interesse: ${bairrosStr}
- Classificação: ${lead.classificacao || 'lead comum'}
`;

    // --- Layer 3: Property & Knowledge Context (JIT) ---
    let layer3 = '';
    if (jitSnippet) {
      layer3 = `\n${jitSnippet}`;
    } else if (targetProperty) {
      const enderecoCompleto = [
        targetProperty.rua,
        targetProperty.numero,
        targetProperty.freguesia,
        targetProperty.concelho
      ].filter(Boolean).join(', ');

      layer3 = `
IMÓVEL PRINCIPAL EM PAUTA (Ref: ${targetProperty.referencia}):
- Título: ${targetProperty.titulo}
- Tipo: ${targetProperty.tipo} | Finalidade: ${targetProperty.finalidade}
- Valor: ${country.currency.symbol} ${targetProperty.valor.toLocaleString('pt-BR')} ${targetProperty.valor_locacao ? `(Locação: ${country.currency.symbol} ${targetProperty.valor_locacao})` : ''}
- Endereço: ${enderecoCompleto || 'Endereço sob consulta'}
- Quartos: ${targetProperty.quartos || 0} | Banheiros: ${targetProperty.casas_banho || 0} | Vagas: ${targetProperty.vagas_garagem || 0}
- Condomínio: ${targetProperty.condominio_mensal ? `${country.currency.symbol} ${targetProperty.condominio_mensal}` : 'Isento/Não inf.'}
- Comodidades: ${(targetProperty.comodidades || []).join(', ') || 'Padrão'}
- Descrição: ${targetProperty.descricao || 'Sem descrição adicional'}
`;
    } else if (recommendedProperties.length > 0) {
      layer3 = `
IMÓVEIS CANDIDATOS NA CARTEIRA:
${recommendedProperties.slice(0, 3).map(p => `- Ref: ${p.referencia} | ${p.tipo} em ${p.freguesia || 'região central'} | ${p.quartos || 0} qtos | ${country.currency.symbol} ${p.valor.toLocaleString('pt-BR')}`).join('\n')}
`;
    }

    // --- Layer 4: Dialogue History (Token-budgeted) ---
    const sortedHistory = [...history]
      .sort((a, b) => new Date(a.criado_em || 0).getTime() - new Date(b.criado_em || 0).getTime())
      .slice(-maxHistoryTurns);

    const layer4 = sortedHistory.map(h => {
      let txt = h.message_text || '';
      if (txt.length > 200) txt = txt.substring(0, 200) + '...';
      return `${h.direction === 'inbound' ? 'Cliente' : 'Corretor'}: ${txt}`;
    }).join('\n');

    const systemPrompt = `${layer1.trim()}\n\n${layer2.trim()}${layer3 ? `\n\n${layer3.trim()}` : ''}`;
    const totalText = `${systemPrompt}\n\n${layer4}`;

    return {
      systemPrompt,
      leadSummary: layer2.trim(),
      propertyContext: layer3.trim(),
      historyText: layer4,
      totalTokensEstimated: this.estimateTokens(totalText)
    };
  }
}
