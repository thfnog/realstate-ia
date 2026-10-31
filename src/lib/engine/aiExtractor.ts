/**
 * Motor Unificado de Triagem, Classificação e Extração IA
 *
 * Em uma única chamada de LLM:
 * 1. Classifica o remetente (comprador, locatário, corretor_parceiro, proprietário, ruído)
 * 2. Diferencia Demanda de Cliente vs. Oferta de Imóvel (essencial para Grupos de WhatsApp)
 * 3. Extrai o perfil estruturado (tipo, bairro, orçamento, quartos, vagas, finalidade)
 */

import { callAIWithFallback, parseSafeJSON } from './aiUtils';
import { ModelRouter } from './modelRouter';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';

export interface AILeadProfile {
  nome?: string;
  tipo_interesse?: 'apartamento' | 'casa' | 'cobertura' | 'terreno' | 'chacara' | 'sitio' | 'fazenda' | 'lote' | 'sala_comercial';
  freguesia?: string; // Bairro
  concelho?: string;  // Cidade
  orcamento?: number;
  quartos?: number;
  vagas?: number;
  finalidade?: 'comprar' | 'alugar' | 'investir';
  is_lead: boolean; // TRUE apenas quando há demanda de compra/aluguel ou contato legítimo de cliente
  resumo_ia?: string;
  // Campos unificados de classificação e radar de grupos
  classificacao?: 'comprador' | 'vendedor' | 'locatario' | 'investidor' | 'corretor_parceiro' | 'proprietario' | 'curioso' | 'indefinido';
  confianca?: number;
  motivo?: string;
  tipo_mensagem_grupo?: 'demanda_cliente' | 'oferta_imovel' | 'ruido';
}

export async function extractLeadWithAI(
  text: string,
  imobiliaria_id?: string,
  context: 'group' | 'private' = 'private'
): Promise<AILeadProfile> {
  console.log(`🤖 Triagem + Extração Unificada IA (${context === 'group' ? 'GRUPO' : 'PRIVADO'})...`);

  let feedbackExamples = '';
  try {
    if (imobiliaria_id && !mock.isMockMode()) {
      const { data: examples } = await supabaseAdmin
        .from('ai_feedback')
        .select('text, is_lead_actual')
        .eq('imobiliaria_id', imobiliaria_id)
        .order('created_at', { ascending: false })
        .limit(8);

      if (examples && examples.length > 0) {
        feedbackExamples = examples
          .map((ex) => `- MENSAGEM: "${ex.text}" -> CLASSIFICAÇÃO CORRETA: ${ex.is_lead_actual ? 'LEAD' : 'NÃO É LEAD'}`)
          .join('\n');
      }
    }
  } catch (err) {
    console.warn('⚠️ Falha ao buscar exemplos de feedback:', err);
  }

  const groupInstructions =
    context === 'group'
      ? `CONTEXTO CRÍTICO — MENSAGEM DE GRUPO DE WHATSAPP:
1. Diferencie rigorosamente:
   - "demanda_cliente": Alguém PROCURANDO imóvel para comprar ou alugar (ex: "Procuro apto 3 quartos em Moema", "Tenho cliente para casa em condomínio até 1.5M", "Alguém tem cobertura na Vila Mariana?").
   - "oferta_imovel": Corretor ou proprietário ANUNCIANDO/DIVULGANDO um imóvel disponível (ex: "Vendo apto reformado...", "Oportunidade no Itaim, R$ 950 mil, parceria 50/50", "Locação: sala comercial...").
   - "ruido": Conversas paralelas, bom dia, piadas, política, serviços gerais (encanador, padaria, carros).
2. ATENÇÃO: Em grupos, se for um anúncio de venda/locação ("oferta_imovel"), marque "is_lead": false (pois não é um cliente comprador entrando na fila), mas EXTRAIA todos os dados do imóvel (tipo_interesse, freguesia, quartos, orcamento, finalidade) para o nosso Radar cruzar com a carteira de clientes!
3. Só marque "is_lead": true em grupo se for "demanda_cliente" (alguém buscando imóvel).`
      : `CONTEXTO — CONVERSA PRIVADA (1-PARA-1):
- Se o contato demonstrar interesse em comprar, alugar, visitar imóvel ou pedir informações de imóveis, marque "is_lead": true e "tipo_mensagem_grupo": "demanda_cliente".
- Se for um corretor propondo parceria (mencionou CRECI, parceria 50/50, "sou corretor", "tenho cliente para seu imóvel"), marque "classificacao": "corretor_parceiro".
- Se for um proprietário querendo cadastrar/vender/alugar o próprio imóvel conosco, marque "classificacao": "proprietario" ou "vendedor" e "tipo_mensagem_grupo": "oferta_imovel".`;

  const prompt = `
Você é o motor de inteligência comercial de uma imobiliária brasileira.
Analise a mensagem de WhatsApp abaixo e retorne um JSON estruturado com a classificação do contato, o tipo de intenção e os atributos do imóvel.

${groupInstructions}

MENSAGEM:
"""
${text}
"""

REGRAS GERAIS:
- Ignore completamente assuntos não imobiliários (jogos, carros, vendas de objetos, serviços gerais) -> "is_lead": false, "tipo_mensagem_grupo": "ruido", "classificacao": "curioso".
- Converta valores monetários para números puros em "orcamento" (ex: "900k" -> 900000, "1.5M" -> 1500000, "3.500" -> 3500).
- "tipo_interesse" deve ser um de: 'apartamento', 'casa', 'cobertura', 'terreno', 'chacara', 'sitio', 'fazenda', 'lote', 'sala_comercial'.
- "finalidade" deve ser: 'comprar', 'alugar' ou 'investir'.

${feedbackExamples ? `EXEMPLOS CALIBRADOS PELO CORRETOR:\n${feedbackExamples}\n` : ''}

Retorne APENAS um JSON válido no formato:
{
  "is_lead": boolean,
  "tipo_mensagem_grupo": "demanda_cliente" | "oferta_imovel" | "ruido",
  "classificacao": "comprador" | "locatario" | "investidor" | "vendedor" | "proprietario" | "corretor_parceiro" | "curioso" | "indefinido",
  "confianca": 0.0 a 1.0,
  "motivo": "Breve justificativa",
  "nome": "Nome se mencionado ou null",
  "tipo_interesse": "apartamento" | "casa" | "cobertura" | "terreno" | null,
  "finalidade": "comprar" | "alugar" | "investir" | null,
  "quartos": number | null,
  "vagas": number | null,
  "orcamento": number | null,
  "freguesia": "Bairro mencionado ou null",
  "concelho": "Cidade mencionada ou null",
  "resumo_ia": "Resumo objetivo de 1 linha"
}`;

  try {
    const route = ModelRouter.getRoute('extraction');
    const data = await callAIWithFallback({
      imobiliaria_id,
      feature: 'extraction',
      model: route.primaryModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: route.temperature,
      response_format: { type: 'json_object' },
    });

    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) return { is_lead: false, tipo_mensagem_grupo: 'ruido', classificacao: 'indefinido', confianca: 0 };

    const result = parseSafeJSON(rawContent) as AILeadProfile;
    console.log('✅ Triagem IA:', {
      is_lead: result.is_lead,
      tipo_grupo: result.tipo_mensagem_grupo,
      classificacao: result.classificacao,
      bairro: result.freguesia,
      orcamento: result.orcamento,
    });
    return result;
  } catch (error: any) {
    console.error('❌ Erro na extração via Fallback AI:', error.message);
    return { is_lead: false, tipo_mensagem_grupo: 'ruido', classificacao: 'indefinido', confianca: 0 };
  }
}
