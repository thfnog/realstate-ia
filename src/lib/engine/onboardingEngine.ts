import { callAIWithFallback } from './aiUtils';
import { supabaseAdmin } from '@/lib/supabase';
import type { Lead } from '@/lib/database.types';
import { recommendImoveis } from './recommendImoveis';

export async function generateOnboardingResponse(
  text: string,
  lead: Lead,
  imobiliaria_id: string,
  history: any[] = []
): Promise<string | null> {
  console.log('🤖 Gerando resposta de onboarding inteligente com contexto...');

  // Formatar histórico para a IA (usar cópia para não mutar a original)
  const historyText = [...history].sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime())
    .map(h => `${h.direction === 'inbound' ? 'Cliente' : 'Bot'}: ${h.message_text}`)
    .join('\n');

  const contextPrompt = `
Você é o assistente virtual da ImobIA. Sua função é o pré-atendimento no WhatsApp.
Seja prático, assertivo e use "Smart Brevity" (curto e direto).

HISTÓRICO RECENTE (Ordem Cronológica):
${historyText}

MENSAGEM ATUAL DO CLIENTE: "${text}"

DADOS DO LEAD:
- Nome: ${lead.nome}
- Interesse: ${lead.tipo_interesse || 'Não definido'}
- Orçamento: ${lead.orcamento || 'Não definido'}

REGRAS CRÍTICAS DE INTENÇÃO:
1. SELEÇÃO POR ÍNDICE: Se o cliente disser "a segunda", "a 2", "a primeira", "o último", etc., olhe para a ÚLTIMA lista de imóveis enviada pelo Bot no histórico. Identifique a Referência (Ref) do imóvel naquela posição.
2. AGENDAMENTO: Se o cliente escolheu um imóvel ou quer visitar/ver um específico, retorne intent="agendar" e preencha "selected_property_ref".
3. BUSCA: Se o cliente quer ver "outras opções", "mudar de bairro", "mudar orçamento" ou ainda não viu nenhuma lista, retorne intent="comprar".
4. NÃO REPETIR: Se o cliente acabou de escolher um imóvel da lista, NÃO gere novas recomendações. Foque em agendar.
5. CONTEXTO: Responda de forma humana e curta no "reply_text".

Retorne JSON:
{
  "intent": "comprar" | "vender" | "agendar" | "outro",
  "selected_property_ref": string | null, // A Ref do imóvel (ex: AP123) se ele escolheu um
  "proposed_datetime": string | null, // Data/Hora sugerida pelo cliente em formato ISO se possível, ou texto livre
  "proposed_local": string | null, // Local sugerido ou Ref do imóvel
  "is_price_objection": boolean,
  "new_budget": number | null,
  "reply_text": "Sua resposta curta e humana aqui. NUNCA diga que a visita 'está confirmada'. Diga que 'solicitou o agendamento para confirmação do corretor'."
}
`;

  try {
    const data = await callAIWithFallback({
      imobiliaria_id,
      feature: 'onboarding',
      messages: [{ role: 'user', content: contextPrompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(data.choices[0].message.content);

    // 1. Tratar Venda
    if (result.intent === 'vender') {
      return result.reply_text || "Com certeza! Vou pedir para um consultor especialista em avaliações entrar em contato com você agora mesmo.";
    }

    // 2. Tratar Agendamento ou Escolha de Imóvel Específico
    if (result.intent === 'agendar' || result.selected_property_ref) {
      if (result.intent === 'agendar' || (result.selected_property_ref && result.proposed_datetime)) {
        console.log('📅 Criando evento de agendamento no banco...');
        
        let propertyTitle = 'Visita';
        let propertyLocal = result.proposed_local || 'A definir';

        // Buscar detalhes do imóvel se tiver a Ref
        if (result.selected_property_ref) {
          const { data: imovel } = await supabaseAdmin
            .from('imoveis')
            .select('titulo, freguesia, logradouro, numero')
            .eq('referencia', result.selected_property_ref)
            .maybeSingle();
          
          if (imovel) {
            propertyTitle = `Visita: ${imovel.titulo}`;
            propertyLocal = `${imovel.logradouro || ''}${imovel.numero ? ', ' + imovel.numero : ''} - ${imovel.freguesia || ''}`.trim() || propertyLocal;
          }
        }

        // Tentar converter data para ISO ou usar NOW + 24h como fallback se for lixo
        let eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + 1); // Amanhã por padrão
        eventDate.setHours(14, 0, 0, 0);

        if (result.proposed_datetime) {
          const parsed = new Date(result.proposed_datetime);
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed;
          }
        }

        await supabaseAdmin.from('eventos').insert({
          imobiliaria_id,
          lead_id: lead.id,
          corretor_id: lead.corretor_id,
          tipo: 'visita',
          titulo: propertyTitle,
          descricao: `Agendamento automático via IA.\nSolicitado pelo cliente: ${text}`,
          data_hora: eventDate.toISOString(),
          local: propertyLocal,
          status: 'agendado'
        });
      }
      return result.reply_text;
    }

    // 3. Tratar Busca/Sugestão (Só se não houver um imóvel específico selecionado)
    if ((result.intent === 'comprar' || result.intent === 'alugar' || result.is_price_objection) && !result.selected_property_ref) {
      if (result.is_price_objection && result.new_budget) {
        await supabaseAdmin.from('leads').update({ orcamento: result.new_budget }).eq('id', lead.id);
        lead.orcamento = result.new_budget;
      }

      const imoveis = await recommendImoveis(lead);
      if (imoveis && imoveis.length > 0) {
        const imoveisText = imoveis.slice(0, 3).map(im => 
          `- *${im.titulo}*\n  ${im.freguesia} • ${im.quartos} qtos\n  Valor: ${im.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n  Ref: ${im.referencia}`
        ).join('\n\n');

        const intro = result.reply_text.includes('?') ? result.reply_text : (result.is_price_objection 
          ? `Entendi. Busquei opções mais próximas de ${lead.orcamento?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Veja esses:`
          : `Certo! Selecionei esses imóveis para você:`);

        return `${intro}\n\n${imoveisText}\n\nAlgum desses te interessa para uma visita?`;
      }
    }

    return result.reply_text;
  } catch (err) {
    console.error('❌ Erro no Onboarding Engine:', err);
    return null;
  }
}
