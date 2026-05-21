import { callAIWithFallback, parseSafeJSON } from './aiUtils';

export interface ClassificationResult {
  classificacao: 'comprador' | 'vendedor' | 'locatario' | 'investidor' | 'corretor_parceiro' | 'proprietario' | 'curioso' | 'indefinido';
  confianca: number; // 0.0 to 1.0
  motivo: string;
}

/**
 * Classifies a lead's intention based on their message text
 */
export async function classifyLead(
  text: string,
  imobiliaria_id: string
): Promise<ClassificationResult> {
  const prompt = `Você é um analista inteligente de imobiliária. Analise a seguinte mensagem enviada por um contato via WhatsApp e classifique o remetente em uma das seguintes categorias:
- comprador: Alguém manifestando interesse em comprar um imóvel (ex: quer ver casa, pergunta preço de venda, pede simulação de financiamento).
- locatario: Alguém manifestando interesse em alugar/arrendar um imóvel.
- vendedor: Proprietário querendo vender seu imóvel através da imobiliária.
- proprietario: Proprietário querendo disponibilizar um imóvel para locação ou gestão.
- investidor: Alguém focado em comprar para investir, rentabilidade, leilões, etc.
- corretor_parceiro: Outro corretor de imóveis propondo parceria (mencionou CRECI, "fazer parceria", "sou corretor", "tenho cliente para o seu imóvel", "divisão 50/50", "parceria de vendas", "tenho cliente interessado").
- curioso: Mensagens sem sentido, spam, ou pessoas que não demonstram qualquer interesse imobiliário claro.
- indefinido: Caso não haja informações suficientes para classificar.

Mensagem a analisar:
"""
${text}
"""

Responda ESTRITAMENTE em formato JSON com a seguinte estrutura:
{
  "classificacao": "comprador" | "vendedor" | "locatario" | "investidor" | "corretor_parceiro" | "proprietario" | "curioso" | "indefinido",
  "confianca": 0.0 a 1.0,
  "motivo": "Breve justificativa em português sobre a classificação baseada nas palavras-chave da mensagem"
}`;

  try {
    const response = await callAIWithFallback({
      messages: [
        { role: 'system', content: 'Você é um assistente de classificação imobiliária que retorna estritamente JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      imobiliaria_id,
      feature: 'lead_classification',
      temperature: 0
    });

    const content = response.choices?.[0]?.message?.content || '';
    const parsed = parseSafeJSON(content);

    return {
      classificacao: parsed.classificacao || 'indefinido',
      confianca: typeof parsed.confianca === 'number' ? parsed.confianca : 0.5,
      motivo: parsed.motivo || 'Sem motivo detalhado.'
    };
  } catch (error) {
    console.error('Error classifying lead:', error);
    return {
      classificacao: 'indefinido',
      confianca: 0,
      motivo: 'Erro na chamada de IA para classificação.'
    };
  }
}
