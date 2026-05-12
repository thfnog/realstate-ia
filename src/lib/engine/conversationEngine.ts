/**
 * Conversation Engine v2 — Unified State Machine
 * Replaces onboardingEngine + aiScheduler with a single stateful engine.
 */

import { callAIWithFallback, parseSafeJSON } from './aiUtils';
import { supabaseAdmin } from '@/lib/supabase';
import { recommendImoveis } from './recommendImoveis';
import { buildPropertyMessage, buildTimeSlotsMessage, type PropertyCard, type TimeSlot } from '@/lib/whatsapp/interactiveMessages';
import type { Lead } from '@/lib/database.types';

// --------------- TYPES ---------------

export type ConversationState = 'greeting' | 'qualifying' | 'recommending' | 'feedback' | 'scheduling' | 'visit_confirmed' | 'human_handoff';

export interface ConvStateRecord {
  id: string;
  lead_id: string;
  imobiliaria_id: string;
  state: ConversationState;
  turn_count: number;
  scheduling_attempts: number;
  recommendation_cycles: number;
  last_recommended_refs: string[];
  last_bot_reply_at: string | null;
  selected_property_ref: string | null;
  selected_property_id: string | null;
  context_data: Record<string, any>;
}

export interface EngineResult {
  reply: string | null;
  newState: ConversationState;
  actions: EngineAction[];
  shouldRespond: boolean;
}

export type EngineAction =
  | { type: 'create_event'; data: any }
  | { type: 'update_lead'; data: Record<string, any> }
  | { type: 'handoff'; reason: string };

const MAX_TURNS = 4;
const MAX_SCHEDULING_ATTEMPTS = 2;
const MAX_RECOMMENDATION_CYCLES = 2;
const COOLDOWN_MS = 30 * 60 * 1000; // 30 min

// --------------- STATE MANAGEMENT ---------------

export async function loadOrCreateState(leadId: string, imobiliariaId: string): Promise<ConvStateRecord> {
  const { data: existing } = await supabaseAdmin
    .from('conversation_state')
    .select('*')
    .eq('lead_id', leadId)
    .maybeSingle();

  if (existing) return existing as ConvStateRecord;

  const { data: created, error } = await supabaseAdmin
    .from('conversation_state')
    .insert({ lead_id: leadId, imobiliaria_id: imobiliariaId, state: 'greeting', turn_count: 0 })
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao criar conversation_state:', error);
    return {
      id: '', lead_id: leadId, imobiliaria_id: imobiliariaId,
      state: 'greeting', turn_count: 0, scheduling_attempts: 0,
      recommendation_cycles: 0, last_recommended_refs: [],
      last_bot_reply_at: null, selected_property_ref: null,
      selected_property_id: null, context_data: {}
    };
  }

  return created as ConvStateRecord;
}

async function saveState(stateRecord: ConvStateRecord): Promise<void> {
  if (!stateRecord.id) return;
  await supabaseAdmin
    .from('conversation_state')
    .update({
      state: stateRecord.state,
      turn_count: stateRecord.turn_count,
      scheduling_attempts: stateRecord.scheduling_attempts,
      recommendation_cycles: stateRecord.recommendation_cycles,
      last_recommended_refs: stateRecord.last_recommended_refs,
      last_bot_reply_at: new Date().toISOString(),
      selected_property_ref: stateRecord.selected_property_ref,
      selected_property_id: stateRecord.selected_property_id,
      context_data: stateRecord.context_data,
      updated_at: new Date().toISOString()
    })
    .eq('id', stateRecord.id);
}

// --------------- GUARD: SHOULD BOT RESPOND? ---------------

export function shouldBotRespond(stateRecord: ConvStateRecord): { allowed: boolean; reason?: string } {
  if (stateRecord.state === 'human_handoff' || stateRecord.state === 'visit_confirmed') {
    return { allowed: false, reason: `Estado terminal: ${stateRecord.state}` };
  }

  if (stateRecord.turn_count >= MAX_TURNS) {
    return { allowed: false, reason: `Max turnos atingido (${MAX_TURNS})` };
  }

  if (stateRecord.last_bot_reply_at) {
    const elapsed = Date.now() - new Date(stateRecord.last_bot_reply_at).getTime();
    if (elapsed < 5000) { // 5s debounce (not full cooldown for active convos)
      return { allowed: false, reason: 'Debounce: bot respondeu há menos de 5s' };
    }
  }

  return { allowed: true };
}

// --------------- AVAILABLE SLOTS ---------------

async function findAvailableSlots(corretorId: string, imobId: string, preferredDay?: string): Promise<TimeSlot[]> {
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  // Fetch existing events
  const { data: eventos } = await supabaseAdmin
    .from('eventos')
    .select('data_hora, titulo')
    .eq('corretor_id', corretorId)
    .gte('data_hora', now.toISOString())
    .lte('data_hora', nextWeek.toISOString())
    .in('status', ['agendado']);

  const busyTimes = new Set((eventos || []).map(e => {
    const d = new Date(e.data_hora);
    return `${d.toISOString().split('T')[0]}_${d.getHours()}`;
  }));

  // Fetch work hours
  let workStart = 9, workEnd = 18;
  const { data: imob } = await supabaseAdmin
    .from('imobiliarias')
    .select('horario_inicio, horario_fim')
    .eq('id', imobId)
    .single();

  if (imob?.horario_inicio) workStart = parseInt(imob.horario_inicio.split(':')[0]);
  if (imob?.horario_fim) workEnd = parseInt(imob.horario_fim.split(':')[0]);

  const slots: TimeSlot[] = [];
  const weekdays = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  // Generate slots for next 7 days
  for (let dayOffset = 1; dayOffset <= 7 && slots.length < 3; dayOffset++) {
    const day = new Date();
    day.setDate(day.getDate() + dayOffset);
    const dayOfWeek = day.getDay();

    // Skip Sunday (0)
    if (dayOfWeek === 0) continue;

    const dateStr = day.toISOString().split('T')[0];
    const dayLabel = weekdays[dayOfWeek];
    const dayNum = day.getDate().toString().padStart(2, '0');
    const monthNum = (day.getMonth() + 1).toString().padStart(2, '0');

    for (let hour = workStart; hour < workEnd - 1 && slots.length < 3; hour++) {
      const key = `${dateStr}_${hour}`;
      if (busyTimes.has(key)) continue;

      // Prefer morning/afternoon variety
      if (slots.length === 0 || (slots.length === 1 && hour >= 14) || slots.length === 2) {
        slots.push({
          label: `${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)} (${dayNum}/${monthNum}) às ${hour.toString().padStart(2, '0')}:00`,
          isoDateTime: `${dateStr}T${hour.toString().padStart(2, '0')}:00:00`,
          slotId: `slot_${slots.length + 1}`
        });
      }
    }
  }

  return slots;
}

// --------------- MAIN PROCESS ---------------

export async function processConversation(
  text: string,
  lead: Lead,
  imobiliariaId: string,
  history: any[] = [],
  brokerName?: string
): Promise<EngineResult> {
  const stateRecord = await loadOrCreateState(lead.id, imobiliariaId);

  // Guard check
  const guard = shouldBotRespond(stateRecord);
  if (!guard.allowed) {
    console.log(`🚫 Bot bloqueado: ${guard.reason}`);
    return { reply: null, newState: stateRecord.state, actions: [], shouldRespond: false };
  }

  // Format history (truncate long bot messages like property lists to save tokens)
  const historyText = [...history]
    .sort((a, b) => new Date(a.criado_em || a.created_at || 0).getTime() - new Date(b.criado_em || b.created_at || 0).getTime())
    .slice(-8)
    .map(h => {
       let txt = h.message_text || '';
       if (txt.length > 150) txt = txt.substring(0, 150) + '...[truncado]';
       return `${h.direction === 'inbound' ? 'Cliente' : 'Bot'}: ${txt}`;
    })
    .join('\n');

  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];
  const todayWeekday = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][today.getDay()];

  // Build available slots info if in scheduling-eligible states
  let slotsInfo = '';
  let availableSlots: TimeSlot[] = [];
  if (lead.corretor_id && ['feedback', 'scheduling', 'recommending'].includes(stateRecord.state)) {
    availableSlots = await findAvailableSlots(lead.corretor_id, imobiliariaId);
    if (availableSlots.length > 0) {
      slotsInfo = `\nHORÁRIOS DISPONÍVEIS NA AGENDA:\n${availableSlots.map((s, i) => `${i + 1}. ${s.label}`).join('\n')}`;
    }
  }

  // Pre-fetch properties to provide context to the LLM
  let preFetchedImoveis: any[] = [];
  let imoveisSummary = '';
  if (['qualifying', 'recommending', 'feedback'].includes(stateRecord.state)) {
    preFetchedImoveis = await recommendImoveis(lead);
    if (preFetchedImoveis.length > 0) {
      imoveisSummary = `\nIMÓVEIS ENCONTRADOS PARA RECOMENDAR:\n${preFetchedImoveis.map(im => `- ${im.tipo} em ${im.freguesia || 'bairro não inf.'} (${im.quartos || 0} qtos, orç. ${im.valor || 0})`).join('\n')}\nIMPORTANTE: Se o cliente pediu um bairro e os imóveis acima são de outros bairros, VOCÊ DEVE explicar isso na resposta (Ex: "Não encontrei no [Bairro Pedido], mas tenho opções ótimas no [Bairro do Imóvel]").`;
    } else {
      imoveisSummary = `\nNENHUM IMÓVEL DISPONÍVEL NO MOMENTO para o perfil.`;
    }
  }

  // Detect numbered response (for interactive fallback)
  const numberedMatch = text.trim().match(/^(\d)$/);
  let numberedContext = '';
  if (numberedMatch) {
    const num = parseInt(numberedMatch[1]);
    if (stateRecord.state === 'scheduling' && availableSlots[num - 1]) {
      numberedContext = `\nO cliente respondeu "${num}" para escolher o horário: "${availableSlots[num - 1].label}" (${availableSlots[num - 1].isoDateTime})`;
    } else if (['recommending', 'feedback'].includes(stateRecord.state) && stateRecord.last_recommended_refs.length > 0) {
      const ref = stateRecord.last_recommended_refs[num - 1];
      if (ref) numberedContext = `\nO cliente respondeu "${num}" para escolher o imóvel de Ref: ${ref}`;
    }
  }

  const prompt = `
Você é o corretor ${brokerName || 'da imobiliária'}, conversando com o cliente no WhatsApp. Fale sempre em 1ª pessoa ("Eu tenho", "Eu separei"). Não diga que você é um assistente.

DATA DE HOJE: ${todayISO} (${todayWeekday})

ESTADO ATUAL DA CONVERSA: ${stateRecord.state}
TURNO: ${stateRecord.turn_count + 1} de ${MAX_TURNS}
CICLOS DE RECOMENDAÇÃO: ${stateRecord.recommendation_cycles}

PERSONA (REGRAS DE OURO):
- Tom humano, amigável e SUCINTO. Frases curtas.
- Use "Opa!", "Perfeito!", "Boa!", "Combinado!" naturalmente.
- Emojis com moderação (🙂 👍 🏠).
- NUNCA termine com "Posso ajudar em algo mais?" ou perguntas genéricas.
- Se o cliente der feedback negativo ("quartos pequenos"), reconheça: "Perfeito, isso já me ajuda bastante" e USE o feedback.
- Pergunte NO MÁXIMO 2 coisas por mensagem.
- Seja DIRETO. Corretor bom não enrola.

COMPORTAMENTO POR ESTADO:
- GREETING: Saudação curta + pergunte tipo de imóvel e faixa de valor. Ex: "Vi seu interesse, posso te ajudar! Busca casa ou apartamento? E faixa de valor?"
- QUALIFYING: Refine com 1-2 perguntas (condomínio/aberto? moradia? quartos?). Depois siga para RECOMMENDING.
- RECOMMENDING: Baseado nos "IMÓVEIS ENCONTRADOS", faça uma frase curta de introdução. Se o bairro não bater com o pedido, EXPLIQUE a diferença gentilmente.
- FEEDBACK: O cliente escolheu um imóvel ou deu feedback. Responda comentando sobre a escolha e PERGUNTE SE ELE QUER MAIS DETALHES OU AGENDAR VISITA.
- SCHEDULING: Envie a introdução para os horários (enviados à parte). Confirme a intenção de agendar.
- VISIT_CONFIRMED: Confirme os detalhes da visita. Encerre com "Nos vemos lá! 🤝".

REGRAS ESTRITAS DE INTENÇÃO (MUITO IMPORTANTE):
- SE VOCÊ FIZER UMA PERGUNTA (ex: quantos quartos? qual bairro?), SEU INTENT **DEVE** SER "qualificar".
- NUNCA use intent="recomendar" se você ainda estiver fazendo perguntas de qualificação.
- Se o cliente já respondeu tudo e você vai recomendar, NÃO FAÇA MAIS PERGUNTAS DE QUALIFICAÇÃO. Apenas diga "Separei estas opções para você:" e use intent="recomendar".

REGRAS ANTI-LOOP:
- Se turn_count >= ${MAX_TURNS - 1}, termine com: "Vou pedir para te ligarem do escritório pra gente alinhar os detalhes finais, combinado? 🤝"
- NÃO repita a mesma pergunta que já está no histórico.

HISTÓRICO:
${historyText || '(Primeira mensagem)'}

MENSAGEM DO CLIENTE: "${text}"
${numberedContext}

DADOS DO LEAD:
- Nome: ${lead.nome || 'Não informado'}
- Interesse: ${lead.tipo_interesse || 'Não definido'}
- Orçamento: ${lead.orcamento || 'Não definido'}
- Quartos: ${lead.quartos_interesse || 'Não definido'}
- Bairros: ${(lead.bairros_interesse || []).join(', ') || 'Não definido'}
- Finalidade: ${lead.finalidade || 'Não definida'}
${imoveisSummary}
${slotsInfo}

REFS DE IMÓVEIS JÁ RECOMENDADOS: ${stateRecord.last_recommended_refs.join(', ') || 'Nenhum'}

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "intent": "qualificar" | "recomendar" | "agendar" | "confirmar_horario" | "vender" | "outro" | "handoff",
  "reply_text": "Sua resposta CURTA aqui.",
  "next_state": "greeting" | "qualifying" | "recommending" | "feedback" | "scheduling" | "visit_confirmed" | "human_handoff",
  "selected_property_ref": null,
  "selected_slot_index": null,
  "proposed_datetime": null,
  "has_specific_time": false,
  "lead_updates": {},
  "is_price_objection": false,
  "new_budget": null
}

REGRAS DE RESPOSTA:
1. "intent"="recomendar" → Eu vou buscar e enviar imóveis separadamente. Sua reply_text deve ser APENAS uma frase de introdução.
2. "intent"="agendar" → Eu vou enviar horários separadamente. Sua reply_text deve confirmar a intenção.
3. "intent"="confirmar_horario" → O cliente escolheu um slot. Preencha selected_slot_index (1-3) e proposed_datetime ISO.
4. "intent"="handoff" → Bot encerra. reply_text de despedida mencionando o corretor.
5. NÃO inclua lista de imóveis nem horários no reply_text — isso é feito pelo sistema.
6. Se for ÚLTIMO TURNO (${MAX_TURNS}), force intent="handoff".
`;

  try {
    const data = await callAIWithFallback({
      imobiliaria_id: imobiliariaId,
      feature: 'conversation_v2',
      messages: [
        { role: 'system', content: 'Você é um corretor de imóveis experiente e amigável. Responda APENAS em JSON válido.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const result = parseSafeJSON(data.choices[0].message.content);
    const actions: EngineAction[] = [];
    let finalReply = result.reply_text || '';
    const nextState: ConversationState = result.next_state || stateRecord.state;

    // --- Handle lead_updates ---
    if (result.lead_updates && Object.keys(result.lead_updates).length > 0) {
      actions.push({ type: 'update_lead', data: result.lead_updates });
      Object.assign(lead, result.lead_updates);
    }

    if (result.is_price_objection && result.new_budget) {
      actions.push({ type: 'update_lead', data: { orcamento: result.new_budget } });
      lead.orcamento = result.new_budget;
    }

    // --- Handle RECOMMEND intent ---
    if (result.intent === 'recomendar' || nextState === 'recommending') {
      const imoveis = preFetchedImoveis; // Uses pre-fetched to match LLM context
      if (imoveis.length > 0) {
        const cards: PropertyCard[] = imoveis.map(im => ({
          titulo: im.titulo, tipo: im.tipo, freguesia: im.freguesia,
          quartos: im.quartos, vagas_garagem: im.vagas_garagem,
          valor: im.valor, referencia: im.referencia, id: im.id,
          area_util: im.area_util
        }));
        const propertyMsg = buildPropertyMessage(cards);
        finalReply = finalReply ? `${finalReply}\n\n${propertyMsg}` : propertyMsg;
        stateRecord.last_recommended_refs = imoveis.map(im => im.referencia);
        stateRecord.recommendation_cycles++;
      } else {
        finalReply += '\n\nAinda não encontrei imóveis com esse perfil exato, mas estou de olho nas novidades para te enviar! 👀';
      }
    }

    // --- Handle SCHEDULE intent ---
    if (result.intent === 'agendar' && lead.corretor_id) {
      if (availableSlots.length > 0) {
        const propTitle = stateRecord.selected_property_ref || undefined;
        const slotsMsg = buildTimeSlotsMessage(availableSlots, propTitle);
        finalReply = finalReply ? `${finalReply}\n\n${slotsMsg}` : slotsMsg;
        stateRecord.scheduling_attempts++;
      } else {
        finalReply += '\n\nVou verificar com o corretor a melhor disponibilidade e te retorno, combinado? 👍';
      }
    }

    // --- Handle CONFIRM SLOT ---
    if (result.intent === 'confirmar_horario' && result.proposed_datetime) {
      let eventDate = new Date(result.proposed_datetime);

      // If AI returned slot index, use the real slot data
      if (result.selected_slot_index && availableSlots[result.selected_slot_index - 1]) {
        const selectedSlot = availableSlots[result.selected_slot_index - 1];
        eventDate = new Date(selectedSlot.isoDateTime);
      }

      if (!isNaN(eventDate.getTime())) {
        // Double-check: no conflict at this exact time
        const { data: conflict } = await supabaseAdmin
          .from('eventos')
          .select('id')
          .eq('corretor_id', lead.corretor_id)
          .eq('data_hora', eventDate.toISOString())
          .eq('status', 'agendado')
          .maybeSingle();

        if (conflict) {
          finalReply = 'Ops, parece que esse horário acabou de ser reservado 😅 Vou buscar outro pra você...';
          stateRecord.scheduling_attempts++;
        } else {
          // Fetch property info for event title
          let propertyTitle = 'Visita';
          let propertyLocal = 'A definir';

          if (stateRecord.selected_property_ref) {
            const { data: imovel } = await supabaseAdmin
              .from('imoveis')
              .select('titulo, freguesia, logradouro, numero, cidade, bairro')
              .eq('referencia', stateRecord.selected_property_ref)
              .maybeSingle();

            if (imovel) {
              propertyTitle = `Visita: ${imovel.titulo}`;
              const parts = [imovel.logradouro, imovel.numero, imovel.bairro || imovel.freguesia, imovel.cidade].filter(Boolean);
              propertyLocal = parts.join(', ') || 'A definir';
            }
          }

          actions.push({
            type: 'create_event',
            data: {
              imobiliaria_id: imobiliariaId,
              lead_id: lead.id,
              corretor_id: lead.corretor_id,
              tipo: 'visita',
              titulo: propertyTitle,
              descricao: `Agendamento automático via IA.\nSolicitado pelo cliente: ${text}`,
              data_hora: eventDate.toISOString(),
              local: propertyLocal,
              status: 'agendado'
            }
          });
        }
      }
    }

    // --- Handle HANDOFF ---
    if (result.intent === 'handoff' || nextState === 'human_handoff' || stateRecord.turn_count + 1 >= MAX_TURNS) {
      actions.push({ type: 'handoff', reason: result.intent === 'handoff' ? 'AI decided' : 'Max turns reached' });
      stateRecord.state = 'human_handoff';
    } else {
      stateRecord.state = nextState;
    }

    // Handle property selection
    if (result.selected_property_ref) {
      stateRecord.selected_property_ref = result.selected_property_ref;
    }

    stateRecord.turn_count++;

    // Execute actions
    for (const action of actions) {
      if (action.type === 'create_event') {
        const { error } = await supabaseAdmin.from('eventos').insert(action.data);
        if (error) console.error('❌ Erro ao criar evento:', error.message);
        else console.log('📅 Evento de visita criado com sucesso!');
      }
      if (action.type === 'update_lead') {
        await supabaseAdmin.from('leads').update(action.data).eq('id', lead.id);
      }
      if (action.type === 'handoff') {
        await supabaseAdmin.from('leads').update({ status: 'em_atendimento' }).eq('id', lead.id);
        console.log(`🤝 Handoff: Bot encerrou. Motivo: ${action.reason}`);
      }
    }

    // Save state
    await saveState(stateRecord);

    return {
      reply: finalReply || null,
      newState: stateRecord.state,
      actions,
      shouldRespond: true
    };

  } catch (err) {
    console.error('❌ Erro no ConversationEngine v2:', err);
    return { reply: null, newState: stateRecord.state, actions: [], shouldRespond: false };
  }
}
