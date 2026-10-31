/**
 * Conversation Engine v3 — Unified Agentic State Coordinator
 *
 * Gerencia o estado de sessão, limites de turno (anti-loop) e delega
 * o raciocínio e chamadas de ferramentas exclusivamente ao AgenticEngine.
 */

import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import { AgenticEngine } from './agenticEngine';
import type { Lead } from '@/lib/database.types';

export type ConversationState =
  | 'greeting'
  | 'qualifying'
  | 'recommending'
  | 'feedback'
  | 'scheduling'
  | 'visit_confirmed'
  | 'human_handoff';

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

const MAX_TURNS = 12;

// In-memory state fallback for Mock Mode
const mockStateStore = new Map<string, ConvStateRecord>();

export async function loadOrCreateState(leadId: string, imobiliariaId: string): Promise<ConvStateRecord> {
  if (mock.isMockMode()) {
    const existing = mockStateStore.get(leadId);
    if (existing) return existing;
    const created: ConvStateRecord = {
      id: `state-${leadId}`,
      lead_id: leadId,
      imobiliaria_id: imobiliariaId,
      state: 'greeting',
      turn_count: 0,
      scheduling_attempts: 0,
      recommendation_cycles: 0,
      last_recommended_refs: [],
      last_bot_reply_at: null,
      selected_property_ref: null,
      selected_property_id: null,
      context_data: {},
    };
    mockStateStore.set(leadId, created);
    return created;
  }

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
      id: '',
      lead_id: leadId,
      imobiliaria_id: imobiliariaId,
      state: 'greeting',
      turn_count: 0,
      scheduling_attempts: 0,
      recommendation_cycles: 0,
      last_recommended_refs: [],
      last_bot_reply_at: null,
      selected_property_ref: null,
      selected_property_id: null,
      context_data: {},
    };
  }

  return created as ConvStateRecord;
}

async function saveState(stateRecord: ConvStateRecord): Promise<void> {
  if (mock.isMockMode()) {
    mockStateStore.set(stateRecord.lead_id, stateRecord);
    return;
  }
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', stateRecord.id);
}

export function shouldBotRespond(stateRecord: ConvStateRecord): { allowed: boolean; reason?: string } {
  if (stateRecord.state === 'human_handoff' || stateRecord.state === 'visit_confirmed') {
    return { allowed: false, reason: `Estado terminal: ${stateRecord.state}` };
  }

  if (stateRecord.turn_count >= MAX_TURNS) {
    return { allowed: false, reason: `Max turnos atingido (${MAX_TURNS})` };
  }

  if (stateRecord.last_bot_reply_at && !mock.isMockMode()) {
    const elapsed = Date.now() - new Date(stateRecord.last_bot_reply_at).getTime();
    if (elapsed < 3000) {
      return { allowed: false, reason: 'Debounce: bot respondeu há menos de 3s' };
    }
  }

  return { allowed: true };
}

export async function processConversation(
  text: string,
  lead: Lead,
  imobiliariaId: string,
  history: any[] = [],
  brokerName?: string
): Promise<EngineResult> {
  const stateRecord = await loadOrCreateState(lead.id, imobiliariaId);

  const guard = shouldBotRespond(stateRecord);
  if (!guard.allowed) {
    console.log(`🚫 Bot bloqueado: ${guard.reason}`);
    return { reply: null, newState: stateRecord.state, actions: [], shouldRespond: false };
  }

  // Se atingiu o penúltimo turno permitido, faz handoff elegante para o corretor
  if (stateRecord.turn_count + 1 >= MAX_TURNS) {
    stateRecord.turn_count++;
    stateRecord.state = 'human_handoff';
    await saveState(stateRecord);
    if (!mock.isMockMode()) {
      await supabaseAdmin.from('leads').update({ status: 'em_atendimento' }).eq('id', lead.id);
    } else {
      mock.updateLead(lead.id, { status: 'em_atendimento' });
    }
    return {
      reply: 'Perfeito! Já anotei todos os detalhes aqui e vou te chamar diretamente pra gente alinhar os próximos passos, combinado? 🤝',
      newState: 'human_handoff',
      actions: [{ type: 'handoff', reason: 'Max turns reached' }],
      shouldRespond: true,
    };
  }

  try {
    const agenticResult = await AgenticEngine.processMessage(
      text,
      lead,
      imobiliariaId,
      history,
      brokerName,
      lead.corretor_id || undefined
    );

    if (agenticResult.shouldRespond && agenticResult.reply) {
      stateRecord.turn_count++;
      stateRecord.state = (agenticResult.newState as ConversationState) || stateRecord.state;
      stateRecord.last_bot_reply_at = new Date().toISOString();
      await saveState(stateRecord);

      return {
        reply: agenticResult.reply,
        newState: stateRecord.state,
        actions: agenticResult.actions as any,
        shouldRespond: true,
      };
    }

    return { reply: null, newState: stateRecord.state, actions: [], shouldRespond: false };
  } catch (err: any) {
    console.error('❌ [conversationEngine] Erro no processamento:', err.message);
    return { reply: null, newState: stateRecord.state, actions: [], shouldRespond: false };
  }
}
