import { supabaseAdmin } from '@/lib/supabase';
import type { Lead, Imovel } from '@/lib/database.types';
import { recommendImoveis } from './recommendImoveis';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function generateOnboardingResponse(
  text: string,
  lead: Lead,
  imobiliaria_id: string
): Promise<string | null> {
  console.log('🤖 Gerando resposta de onboarding inteligente...');

  if (!GROQ_API_KEY) return null;

  // 1. Identificar Intenção Profunda (Comprador vs Vendedor vs Agendamento)
  const contextPrompt = `
Você é o assistente virtual da ImobIA. Sua função é realizar o pré-atendimento de clientes no WhatsApp.
O cliente enviou a seguinte mensagem: "${text}"

Dados conhecidos do lead:
- Nome: ${lead.nome}
- Interesse: ${lead.tipo_interesse || 'Não especificado'}
- Finalidade: ${lead.finalidade || 'Não especificada'}
- Orçamento: ${lead.orcamento || 'Não especificado'}

REGRAS:
1. Identifique se o cliente quer COMPRAR, VENDER, ALUGAR ou se quer AGENDAR uma visita.
2. Identifique se houve uma OBJEÇÃO DE PREÇO (ex: "está caro", "algo mais barato", "na faixa de X").
3. Se o cliente quer VENDER, ele deve ser encaminhado para um consultor especialista em captação.
4. Responda de forma prática, amigável e profissional (Português Brasil).

Retorne um JSON:
{
  "intent": "comprar" | "vender" | "alugar" | "agendar" | "outro",
  "is_price_objection": boolean,
  "new_budget": number | null,
  "reply_text": "Sua sugestão de resposta aqui"
}
`;

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [{ role: 'user', content: contextPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Se for Vendedor, finalizamos o onboarding direcionando
    if (result.intent === 'vender') {
      return result.reply_text || "Com certeza! Temos uma equipe especializada em captação e avaliação de imóveis. Vou pedir para um consultor especialista entrar em contato com você agora mesmo para conversarmos sobre o seu imóvel.";
    }

    // Se for Agendamento, deixamos o aiScheduler (ou lógica posterior) cuidar ou usamos a resposta da IA
    if (result.intent === 'agendar') {
      // Nota: O aiScheduler já faz isso, mas aqui podemos dar um "toque" inicial
      return result.reply_text;
    }

    // Se for Comprador e houver busca por imóveis ou objeção de preço
    if (result.intent === 'comprar' || result.intent === 'alugar' || result.is_price_objection) {
      // Atualizar orçamento se houver objeção
      if (result.is_price_objection && result.new_budget) {
        lead.orcamento = result.new_budget;
        // Salvar no banco (opcional, processLead fará isso se passarmos o objeto atualizado)
        await supabaseAdmin.from('leads').update({ orcamento: result.new_budget }).eq('id', lead.id);
      }

      const imoveis = await recommendImoveis(lead);
      
      if (imoveis && imoveis.length > 0) {
        const imoveisText = imoveis.slice(0, 3).map(im => 
          `- *${im.titulo}*\n  ${im.freguesia} • ${im.quartos} qtos\n  Valor: ${im.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n  Ref: ${im.referencia}`
        ).join('\n\n');

        const intro = result.is_price_objection 
          ? `Entendi perfeitamente. Busquei aqui opções mais próximas do valor que você comentou (${result.new_budget?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). Veja esses:`
          : `Certo! Selecionei alguns imóveis que se encaixam no que você procura:`;

        return `${intro}\n\n${imoveisText}\n\nAlgum desses te interessa para uma visita?`;
      } else {
        return "No momento não encontrei um imóvel exatamente com essas características, mas vou monitorar nossa base e te aviso assim que entrar algo! Enquanto isso, quer me dar mais detalhes do que é essencial para você?";
      }
    }

    return result.reply_text;

  } catch (err) {
    console.error('❌ Erro no Onboarding Engine:', err);
    return null;
  }
}
