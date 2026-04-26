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

export async function extractLeadWithAI(text: string): Promise<AILeadProfile> {
  console.log('🤖 Consultando Groq para extração de dados...');

  if (!GROQ_API_KEY) {
    console.warn('⚠️ GROQ_API_KEY não configurada. Usando fallback seguro (ignorar).');
    return { is_lead: false };
  }

  const prompt = `
Você é um classificador e extrator de dados para uma imobiliária brasileira.
Sua tarefa é triar mensagens do WhatsApp e extrair informações apenas se forem relevantes para o negócio imobiliário (compra, venda, aluguel, dúvidas sobre imóveis).

MENSAGEM DO CLIENTE:
"${text}"

REGRAS DE CLASSIFICAÇÃO (is_lead):
- Marque "is_lead": true se houver intenção clara de NEGÓCIO IMOBILIÁRIO (ex: busca por imóveis, perguntas sobre preços, agendamento de visitas, ou interesse em vender/alugar seu próprio imóvel).
- Marque "is_lead": false para RELATOS DE STATUS, conversas sociais ou saudações genéricas sem contexto (ex: "estava atendendo o cliente", "estou em reunião", "já te ligo", "tô no trânsito", "correndo", "semana corrida", "semana corrida man", "correria braba", "ok", "beleza", "combinado").
- IMPORTANTE: Mensagens que são apenas saudações ("Oi", "Bom dia") ou status ("Tô correndo") NÃO são leads.
- EXCEÇÃO: Se a mensagem contém APENAS um nome próprio (ex: "Pedro", "Maria Silva", "Sou o Carlos") e nada mais, pode marcar como "is_lead": true para capturarmos o nome, mas seja criterioso.

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
