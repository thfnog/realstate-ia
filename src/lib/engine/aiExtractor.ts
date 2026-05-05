/**
 * Motor de Extração IA — Groq / OpenAI Compatible
 * 
 * Este módulo usa uma LLM (Groq Llama 3) para extrair dados estruturados
 * de mensagens livres enviadas via WhatsApp.
 */

export interface AILeadProfile {
  nome?: string;
  tipo_interesse?: 'apartamento' | 'casa' | 'terreno' | 'chacara' | 'sitio' | 'fazenda' | 'lote';
  freguesia?: string; // Bairro
  concelho?: string;  // Cidade
  orcamento?: number;
  quartos?: number;
  vagas?: number;
  finalidade?: 'comprar' | 'alugar' | 'investir';
  is_lead: boolean; // TRUE if it is real estate related, FALSE if noise/social
  resumo_ia?: string;
}

import { callAIWithFallback } from './aiUtils';
import { supabaseAdmin } from '@/lib/supabase';

export async function extractLeadWithAI(
  text: string, 
  imobiliaria_id?: string, 
  context: 'group' | 'private' = 'private'
): Promise<AILeadProfile> {
  console.log(`🤖 Consultando Groq para extração de dados (${context === 'group' ? 'GRUPO' : 'PRIVADO'})...`);

  // ... (feedback fetch logic same as before)
  let feedbackExamples = '';
  try {
    if (imobiliaria_id) {
      const { data: examples } = await supabaseAdmin
        .from('ai_feedback')
        .select('text, is_lead_actual')
        .eq('imobiliaria_id', imobiliaria_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (examples && examples.length > 0) {
        feedbackExamples = examples.map(ex => 
          `- MENSAGEM: "${ex.text}" -> CLASSIFICAÇÃO CORRETA: ${ex.is_lead_actual ? 'LEAD' : 'NÃO É LEAD'}`
        ).join('\n');
      }
    }
  } catch (err) {
    console.warn('⚠️ Falha ao buscar exemplos de feedback:', err);
  }

  const groupStrictness = context === 'group' 
    ? `ATENÇÃO: Esta mensagem veio de um GRUPO de WhatsApp. 
       Ignore conversas paralelas, piadas, sugestões de locais que não sejam imóveis (ex: padarias, farmácias), saudações casuais ou discussões gerais.
       SÓ marque "is_lead": true se a pessoa estiver claramente buscando um imóvel para COMPRAR/ALUGAR ou oferecendo um para VENDER.`
    : '';

  const prompt = `
Você é um classificador e extrator de dados para uma imobiliária brasileira.
Sua tarefa é triar mensagens do WhatsApp e extrair informações apenas se forem relevantes para o negócio imobiliário (compra, venda, aluguel, dúvidas sobre imóveis).

${groupStrictness}

MENSAGEM DO CLIENTE:
"${text}"

REGRAS DE CLASSIFICAÇÃO (is_lead):
- Marque "is_lead": true apenas se houver intenção EXPLÍCITA de NEGÓCIO IMOBILIÁRIO (ex: busca por imóveis, perguntas sobre preços, agendamento de visitas, interesse em vender/alugar, pedido de catálogo).
- Marque "is_lead": false para conversas sobre o bairro, padarias, trânsito, segurança ou sugestões genéricas que NÃO sejam transações imobiliárias.
- Se o usuário só disse "Oi" ou "Bom dia" sem contexto, é FALSE.
- Se a mensagem for muito curta ou sem sentido comercial, é FALSE.

${feedbackExamples ? `EXEMPLOS DE APRENDIZADO (FEEDBACK DO USUÁRIO):\n${feedbackExamples}\n` : ''}

REGRAS DE EXTRAÇÃO:
1. Extraia o nome se mencionado de forma clara.
2. Identifique o tipo: 'apartamento', 'casa', 'terreno', 'chacara', 'sitio', 'fazenda' ou 'lote'.
3. Identifique a finalidade: 'comprar', 'alugar' ou 'investir'.
4. Identifique o bairro (freguesia) e cidade (concelho).
5. Identifique o número de vagas de garagem (vagas).
6. Converta valores monetários para números puros.
7. Retorne APENAS um objeto JSON puro.

EXEMPLO DE SAÍDA (LEAD):
{
  "is_lead": true,
  "nome": "[NOME DO CLIENTE]",
  "tipo_interesse": "casa",
  "finalidade": "comprar",
  "freguesia": "[BAIRRO]",
  "resumo_ia": "Cliente busca casa de alto padrão para compra no bairro [BAIRRO]."
}

EXEMPLO DE SAÍDA (RUÍDO/STATUS):
{
  "is_lead": false,
  "resumo_ia": "Relato de status ou conversa social (ex: correndo)."
}
  `;

  try {
    const data = await callAIWithFallback({
      imobiliaria_id,
      feature: 'extraction',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' }
    });

    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) return { is_lead: false };

    const cleanJson = rawContent.replace(/```json\n?|```/g, '').trim();
    const result = JSON.parse(cleanJson);
    
    console.log('✅ Dados extraídos via IA:', result);
    return result as AILeadProfile;

  } catch (error: any) {
    console.error('❌ Erro na extração via Fallback AI:', error.message);
    return { is_lead: false };
  }
}
