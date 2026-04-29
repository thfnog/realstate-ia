/**
 * Motor de Extração IA — Groq / OpenAI Compatible
 * 
 * Este módulo usa uma LLM (Groq Llama 3) para extrair dados estruturados
 * de mensagens livres enviadas via WhatsApp.
 */

export interface AILeadProfile {
  nome?: string;
  tipo_interesse?: 'apartamento' | 'casa' | 'terreno';
  freguesia?: string; // Bairro
  concelho?: string;  // Cidade
  orcamento?: number;
  quartos?: number;
  is_lead: boolean; // TRUE if it is real estate related, FALSE if noise/social
  resumo_ia?: string;
}

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

import { supabaseAdmin } from '@/lib/supabase';

export async function extractLeadWithAI(text: string, imobiliaria_id?: string): Promise<AILeadProfile> {
  console.log('🤖 Consultando Groq para extração de dados...');

  if (!GROQ_API_KEY) {
    console.warn('⚠️ GROQ_API_KEY não configurada. Usando fallback seguro (ignorar).');
    return { is_lead: false };
  }

  // Fetch recent feedback examples to improve accuracy (Few-Shot Learning)
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

  const prompt = `
Você é um classificador e extrator de dados para uma imobiliária brasileira.
Sua tarefa é triar mensagens do WhatsApp e extrair informações apenas se forem relevantes para o negócio imobiliário (compra, venda, aluguel, dúvidas sobre imóveis).

MENSAGEM DO CLIENTE:
"${text}"

REGRAS DE CLASSIFICAÇÃO (is_lead):
- Marque "is_lead": true apenas se houver intenção EXPLÍCITA de NEGÓCIO IMOBILIÁRIO (ex: busca por imóveis, perguntas sobre preços, agendamento de visitas, interesse em vender/alugar, pedido de catálogo).
- Marque "is_lead": false para RELATOS DE STATUS, conversas sociais, ou saudações genéricas isoladas (ex: "Oi", "Bom dia", "Tudo bem?", "Tô no trânsito", "Já te ligo", "Beleza", "Valeu", "Estou ocupado", "Semana corrida").
- IMPORTANTE: Mensagens que são APENAS saudações sem acompanhamento de uma dúvida ou pedido NÃO são leads. Se o usuário só disse "Oi", marque como false.
- Se a mensagem for muito curta (menos de 10 caracteres) e for apenas social, SEMPRE marque false.

${feedbackExamples ? `EXEMPLOS DE APRENDIZADO (FEEDBACK DO USUÁRIO):\n${feedbackExamples}\n` : ''}

REGRAS DE EXTRAÇÃO:
1. Extraia o nome se mencionado de forma clara (ex: "Sou o Carlos").
2. Identifique o tipo: 'apartamento', 'casa' ou 'terreno'.
3. Identifique o bairro (freguesia) e cidade (concelho).
4. Converta valores monetários para números puros.
5. Retorne APENAS um objeto JSON puro.

EXEMPLO DE SAÍDA (LEAD):
{
  "is_lead": true,
  "nome": "Roberto",
  "tipo_interesse": "casa",
  "freguesia": "Swiss Park",
  "resumo_ia": "Cliente busca casa de alto padrão."
}

EXEMPLO DE SAÍDA (RUÍDO/STATUS):
{
  "is_lead": false,
  "resumo_ia": "Relato de status ou conversa social (ex: correndo)."
}
  `;

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API do Groq:', response.status, errorText);
      return { is_lead: false };
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error('⚠️ Resposta do Groq sem conteúdo:', data);
      return { is_lead: false };
    }

    const cleanJson = rawContent.replace(/```json\n?|```/g, '').trim();
    const result = JSON.parse(cleanJson);
    
    console.log('✅ Dados extraídos via IA:', result);
    return result as AILeadProfile;

  } catch (error) {
    console.error('❌ Erro na extração via Groq:', error);
    return { is_lead: false };
  }
}
