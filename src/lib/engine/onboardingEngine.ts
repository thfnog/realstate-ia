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

  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];
  const todayWeekday = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'][today.getDay()];

  const contextPrompt = `
Você é o assistente virtual da ImobIA, atuando como um corretor parceiro e experiente. Sua função é o pré-atendimento no WhatsApp.

DATA DE HOJE: ${todayISO} (${todayWeekday})

ESTILO DE CONVERSA (PERSONA):
- Use um tom humano, amigável e proativo. Use termos como "Opa!", "Tudo bem?", "Boa!", "Perfeito!", "Combinado!".
- Use emojis de forma natural (ex: 🙂, 👍, 🏠, 🤝).
- Seja direto (Smart Brevity), mas sempre gentil.
- Se o cliente der um feedback negativo sobre um imóvel (ex: "queria quartos maiores"), reconheça ("Perfeito, já me ajudou bastante a entender") e use isso para o próximo passo.
- NUNCA termine a mensagem com perguntas desnecessárias como "Você está pronto para a visita?" ou "Posso ajudar em algo mais?". Seja objetivo.

COMPORTAMENTO POR TIPO DE IMÓVEL:
- TERRENOS/CHÁCARAS: Pergunte se o foco é lazer ou moradia.
- APARTAMENTOS/CASAS: Pergunte se prefere condomínio fechado ou bairro aberto.

HISTÓRICO RECENTE (Ordem Cronológica):
${historyText}

MENSAGEM ATUAL DO CLIENTE: "${text}"

DADOS DO LEAD:
- Nome: ${lead.nome}
- Interesse: ${lead.tipo_interesse || 'Não definido'}
- Orçamento: ${lead.orcamento || 'Não definido'}

REGRAS DE INTENÇÃO E AGENDAMENTO (MUITO IMPORTANTE):
1. SELEÇÃO: Se o cliente escolher um imóvel da lista anterior (ex: "o segundo"), identifique a Ref.
2. AGENDAMENTO: Só retorne intent="agendar" se o cliente expressar desejo CLARO de VISITAR ou VER o imóvel pessoalmente.
   - NÃO agende se for apenas uma dúvida de disponibilidade.
   - NÃO agende se a data mencionada for para outra coisa (ex: "previsão dos móveis é 10 de Julho").
   - Se ele deu DATA + HORÁRIO, preencha proposed_datetime em formato ISO (YYYY-MM-DDTHH:mm:ss). Use a DATA DE HOJE acima para calcular "amanhã", "sábado", etc.
   - Se ele não deu horário, pergunte no "reply_text" e mantenha has_specific_time=false.
3. NUNCA invente horários.
4. Na reply_text do agendamento, INCLUA o endereço completo do imóvel se estiver no histórico.

Retorne JSON:
{
  "intent": "comprar" | "vender" | "agendar" | "outro",
  "selected_property_ref": string | null,
  "proposed_datetime": string | null, // OBRIGATORIAMENTE em formato ISO: YYYY-MM-DDTHH:mm:ss. Calcule a data usando DATA DE HOJE.
  "has_specific_time": boolean,
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
        console.log('📅 proposed_datetime bruto:', result.proposed_datetime);
        
        let propertyTitle = 'Visita';
        let propertyLocal = 'A definir';

        if (result.selected_property_ref) {
          const { data: imovel } = await supabaseAdmin
            .from('imoveis')
            .select('titulo, freguesia, logradouro, numero, cidade, bairro')
            .eq('referencia', result.selected_property_ref)
            .maybeSingle();
          
          if (imovel) {
            propertyTitle = `Visita: ${imovel.titulo}`;
            const parts = [imovel.logradouro, imovel.numero, imovel.bairro || imovel.freguesia, imovel.cidade].filter(Boolean);
            propertyLocal = parts.join(', ') || 'A definir';
          }
        }

        // Parse robusto de data: tentar ISO direto, senão construir a partir de hoje
        let eventDate = new Date(result.proposed_datetime);
        if (isNaN(eventDate.getTime())) {
          // Fallback: tentar extrair hora de strings como "sábado às 10h"
          console.log('⚠️ proposed_datetime não é ISO válido, tentando parse manual...');
          const horaMatch = result.proposed_datetime.match(/(\d{1,2})[h:](\d{0,2})/);
          if (horaMatch) {
            const hora = parseInt(horaMatch[1]);
            const minuto = parseInt(horaMatch[2] || '0');
            // Usar amanhã como base se não conseguimos a data
            const base = new Date();
            base.setDate(base.getDate() + 1);
            base.setHours(hora, minuto, 0, 0);
            eventDate = base;
          }
        }

        if (!isNaN(eventDate.getTime())) {
          const insertResult = await supabaseAdmin.from('eventos').insert({
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
          console.log('📅 Resultado do insert:', insertResult.error ? insertResult.error.message : 'OK');
        } else {
          console.error('❌ Não foi possível parsear a data:', result.proposed_datetime);
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
