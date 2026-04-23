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
    console.warn('⚠️ GROQ_API_KEY não configurada. Usando fallback básico.');
    // Poderia chamar o extrator Regex antigo como fallback
    return { is_lead: true };
  }

  const prompt = `
Você é um classificador e extrator de dados para uma imobiliária brasileira.
Sua tarefa é triar mensagens do WhatsApp e extrair informações apenas se forem relevantes para o negócio imobiliário (compra, venda, aluguel, dúvidas sobre imóveis).

MENSAGEM DO CLIENTE:
"${text}"

REGRAS DE CLASSIFICAÇÃO (is_lead):
- Marque "is_lead": true APENAS se houver intenção explícita no mercado imobiliário: busca por imóveis, perguntas sobre aluguel/venda, dúvidas de localização imobiliária ou agendamentos de visita.
- Marque "is_lead": false para recados do dia a dia ("estava atendendo o cliente", "já te ligo", "tô no trânsito"), conversas pessoais com familiares/esposa, saudações isoladas ("bom dia"), ou assuntos de trabalho não imobiliários. A presença de palavras como "cliente" ou "reunião" NÃO torna a mensagem um lead se não houver contexto claro de imóveis.
- EXCEÇÃO: Se a mensagem contém APENAS um nome (ex: "Pedro", "Maria Silva", "Sou o Carlos"), marque "is_lead": true e extraia o nome.

REGRAS DE EXTRAÇÃO:
1. Extraia o nome se mencionado — mesmo que seja a ÚNICA informação na mensagem.
   Exemplos de mensagens que contêm nome:
   - "Pedro" → nome: "Pedro"
   - "Sou o Carlos" → nome: "Carlos"
   - "Me chamo Ana" → nome: "Ana"
   - "Meu nome é Roberto Silva" → nome: "Roberto Silva"
   - "É Maria" → nome: "Maria"
2. Identifique o tipo: 'apartamento', 'casa' ou 'terreno'.
3. Identifique o bairro (freguesia) e cidade (concelho).
4. Converta valores monetários para números puros (ex: 1.5 milhão = 1500000).
5. Extraia o número de quartos.
6. Se não encontrar uma informação, deixe nulo.
7. Retorne APENAS um objeto JSON puro.

EXEMPLO DE SAÍDA (LEAD):
{
  "is_lead": true,
  "nome": "Roberto",
  "tipo_interesse": "casa",
  "freguesia": "Swiss Park",
  "orcamento": 1800000,
  "resumo_ia": "Cliente busca casa de alto padrão."
}

EXEMPLO DE SAÍDA (APENAS NOME):
{
  "is_lead": true,
  "nome": "Carlos",
  "resumo_ia": "Cliente informou seu nome."
}

EXEMPLO DE SAÍDA (RUÍDO):
{
  "is_lead": false,
  "resumo_ia": "Conversa social ou saudação genérica."
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
      return { is_lead: true };
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error('⚠️ Resposta do Groq sem conteúdo:', data);
      return { is_lead: true };
    }

    // Clean markdown code blocks if the model included them
    const cleanJson = rawContent.replace(/```json\n?|```/g, '').trim();
    const result = JSON.parse(cleanJson);
    
    console.log('✅ Dados extraídos via IA:', result);
    return result as AILeadProfile;

  } catch (error) {
    console.error('❌ Erro na extração via Groq:', error);
    return { is_lead: true };
  }
}
