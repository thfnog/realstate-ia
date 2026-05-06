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
Você é o assistente virtual da ImobIA, atuando como um corretor parceiro e experiente. Sua função é o pré-atendimento no WhatsApp.

ESTILO DE CONVERSA (PERSONA):
- Use um tom humano, amigável e proativo. Use termos como "Opa!", "Tudo bem?", "Boa!", "Perfeito!", "Combinado!".
- Use emojis de forma natural (ex: 🙂, 👍, 🏠, 🤝).
- Seja direto (Smart Brevity), mas sempre gentil.
- Se o cliente der um feedback negativo sobre um imóvel (ex: "queria quartos maiores"), reconheça ("Perfeito, já me ajudou bastante a entender") e use isso para o próximo passo.

COMPORTAMENTO POR TIPO DE IMÓVEL:
- TERRENOS/CHÁCARAS: Pergunte se o foco é lazer ou moradia. Mencione que vai buscar opções com boa topografia ou área de lazer.
- APARTAMENTOS/CASAS: Pergunte se prefere condomínio fechado ou bairro aberto. Questione sobre a importância de itens como varanda, vagas de garagem ou escritório (home office).

HISTÓRICO RECENTE (Ordem Cronológica):
${historyText}

MENSAGEM ATUAL DO CLIENTE: "${text}"

DADOS DO LEAD:
- Nome: ${lead.nome}
- Interesse: ${lead.tipo_interesse || 'Não definido'}
- Orçamento: ${lead.orcamento || 'Não definido'}

REGRAS DE INTENÇÃO E AGENDAMENTO (MUITO IMPORTANTE):
1. SELEÇÃO: Se o cliente escolher um imóvel da lista anterior (ex: "o segundo"), identifique a Ref.
2. AGENDAMENTO: Só retorne intent="agendar" se o cliente expressar desejo CLARO de VISITAR ou VER o imóvel pessoalmente (ex: "quero visitar", "quero ver", "marcar visita", "posso ir aí amanhã?").
   - NÃO agende se for apenas uma dúvida de disponibilidade (ex: "Pode ser o apto 31?" ou "Tem o 25 disponível?"). Isso é intent="comprar" ou "outro".
   - NÃO agende se a data mencionada for para outra coisa (ex: "previsão dos móveis é 10 de Julho"). Só use datas se forem para a VISITA.
   - Só confirme no JSON se o cliente mencionou DATA e HORÁRIO para a visita. Se ele não deu horário, pergunte no "reply_text" e mantenha has_specific_time=false.
3. NUNCA invente horários. Se o cliente não falou "às 14h", "de manhã", etc., não preencha proposed_datetime com um horário específico.

Retorne JSON:
{
  "intent": "comprar" | "vender" | "agendar" | "outro",
  "selected_property_ref": string | null,
  "proposed_datetime": string | null, // ISO se houver data E hora. Se só data, mande a data (YYYY-MM-DD).
  "has_specific_time": boolean, // true APENAS se o cliente falou a hora da visita.
  "is_price_objection": boolean,
  "new_budget": number | null,
  "reply_text": "Sua resposta amigável aqui."
}
`;

  try {
    const data = await callAIWithFallback({
      imobiliaria_id,
      feature: 'onboarding',
      messages: [{ role: 'system', content: 'Você é um corretor de imóveis experiente e amigável.' }, { role: 'user', content: contextPrompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(data.choices[0].message.content);

    // 1. Tratar Venda
    if (result.intent === 'vender') {
      return result.reply_text || "Com certeza! Vou pedir para um consultor especialista em avaliações entrar em contato com você agora mesmo.";
    }

    // 2. Tratar Agendamento ou Escolha de Imóvel Específico
    if (result.intent === 'agendar' || result.selected_property_ref) {
      // SÓ INSERE NO BANCO SE TIVER DATA E HORA DEFINIDOS
      if (result.intent === 'agendar' && result.proposed_datetime && result.has_specific_time) {
        console.log('📅 Criando evento de agendamento no banco...');
        
        let propertyTitle = 'Visita';
        let propertyLocal = 'A definir';

        if (result.selected_property_ref) {
          const { data: imovel } = await supabaseAdmin
            .from('imoveis')
            .select('titulo, freguesia, logradouro, numero')
            .eq('referencia', result.selected_property_ref)
            .maybeSingle();
          
          if (imovel) {
            propertyTitle = `Visita: ${imovel.titulo}`;
            propertyLocal = `${imovel.logradouro || ''}${imovel.numero ? ', ' + imovel.numero : ''} - ${imovel.freguesia || ''}`.trim();
          }
        }

        const eventDate = new Date(result.proposed_datetime);
        if (!isNaN(eventDate.getTime())) {
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
      }
      return result.reply_text;
    }

    // 3. Tratar Busca/Sugestão
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

        const intro = result.reply_text;
        return `${intro}\n\n${imoveisText}\n\nAlgum desses te interessa para uma visita?`;
      }
    }

    return result.reply_text;
  } catch (err) {
    console.error('❌ Erro no Onboarding Engine:', err);
    return null;
  }
}
