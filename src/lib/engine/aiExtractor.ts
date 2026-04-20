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
  resumo_ia?: string;
}

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function extractLeadWithAI(text: string): Promise<AILeadProfile> {
  console.log('🤖 Consultando Groq para extração de dados...');

  if (!GROQ_API_KEY) {
    console.warn('⚠️ GROQ_API_KEY não configurada. Usando fallback básico.');
    // Poderia chamar o extrator Regex antigo como fallback
    return {};
  }

  const prompt = `
Você é um assistente especializado em imobiliárias brasileiras.
Sua tarefa é extrair informações estruturadas de mensagens de clientes interessados em imóveis.

MENSAGEM DO CLIENTE:
"${text}"

REGRAS:
1. Extraia o nome se mencionado.
2. Identifique o tipo: 'apartamento', 'casa' ou 'terreno'.
3. Identifique o bairro (freguesia) e cidade (concelho).
4. Converta valores monetários para números puros (ex: 1.5 milhão = 1500000).
5. Extraia o número de quartos.
6. Se não encontrar uma informação, deixe nulo.
7. Retorne APENAS um objeto JSON puro, sem explicações.

EXEMPLO DE SAÍDA:
{
  "nome": "Roberto",
  "tipo_interesse": "casa",
  "freguesia": "Swiss Park",
  "concelho": "Indaiatuba",
  "orcamento": 1800000,
  "quartos": 3,
  "resumo_ia": "Cliente busca casa de alto padrão no Swiss Park."
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
        model: 'llama-3.1-8b-instant', // Modelo rápido e eficiente
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API do Groq:', response.status, errorText);
      return {};
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error('⚠️ Resposta do Groq sem conteúdo:', data);
      return {};
    }

    // Clean markdown code blocks if the model included them
    const cleanJson = rawContent.replace(/```json\n?|```/g, '').trim();
    const result = JSON.parse(cleanJson);
    
    console.log('✅ Dados extraídos via IA:', result);
    return result as AILeadProfile;

  } catch (error) {
    console.error('❌ Erro na extração via Groq:', error);
    return {};
  }
}
