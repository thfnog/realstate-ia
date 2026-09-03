/**
 * API Human Handoff / Assumir Conversa
 * GET /api/leads/[id]/handoff — Consulta o estado do handoff
 * POST /api/leads/[id]/handoff — Pausa (human_handoff) ou reativa a IA
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (mock.isMockMode()) {
      const isPaused = mock.getLeadById(id)?.status === 'em_atendimento';
      return NextResponse.json({
        state: isPaused ? 'human_handoff' : 'qualifying',
        is_human_handoff: isPaused,
        updated_at: new Date().toISOString()
      });
    }

    const { data: convState, error } = await supabaseAdmin
      .from('conversation_state')
      .select('*')
      .eq('lead_id', id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar conversation_state:', error);
    }

    const isHumanHandoff = convState?.state === 'human_handoff';

    return NextResponse.json({
      state: convState?.state || 'greeting',
      is_human_handoff: isHumanHandoff,
      last_bot_reply_at: convState?.last_bot_reply_at || null,
      updated_at: convState?.updated_at || null
    });
  } catch (error: any) {
    console.error('❌ Erro no GET /api/leads/[id]/handoff:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body.action || (body.pause ? 'assume' : 'reactivate'); // 'assume' | 'reactivate'

    if (mock.isMockMode()) {
      const status = action === 'assume' ? 'em_atendimento' : 'novo';
      mock.updateLead(id, { status });
      return NextResponse.json({
        success: true,
        state: action === 'assume' ? 'human_handoff' : 'qualifying',
        is_human_handoff: action === 'assume',
        message: action === 'assume' ? 'Atendimento humano assumido com sucesso' : 'IA reativada com sucesso'
      });
    }

    // Buscar lead para obter imobiliaria_id
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id, imobiliaria_id, corretor_id, nome, status')
      .eq('id', id)
      .single();

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    const newState = action === 'assume' ? 'human_handoff' : 'qualifying';
    const nowIso = new Date().toISOString();

    // 1. Atualizar ou Inserir conversation_state
    const { data: existingState } = await supabaseAdmin
      .from('conversation_state')
      .select('id')
      .eq('lead_id', id)
      .maybeSingle();

    if (existingState) {
      await supabaseAdmin
        .from('conversation_state')
        .update({
          state: newState,
          updated_at: nowIso,
          turn_count: action === 'assume' ? 10 : 0
        })
        .eq('id', existingState.id);
    } else {
      await supabaseAdmin
        .from('conversation_state')
        .insert({
          lead_id: id,
          imobiliaria_id: lead.imobiliaria_id,
          state: newState,
          turn_count: action === 'assume' ? 10 : 0,
          updated_at: nowIso
        });
    }

    // 2. Atualizar status do lead se assumido
    if (action === 'assume' && lead.status === 'novo') {
      await supabaseAdmin
        .from('leads')
        .update({ status: 'em_atendimento' })
        .eq('id', id);
    }

    // 3. Registrar Evento na Linha do Tempo
    await supabaseAdmin.from('eventos').insert([{
      imobiliaria_id: lead.imobiliaria_id,
      lead_id: id,
      corretor_id: lead.corretor_id || null,
      tipo: 'outro',
      titulo: action === 'assume' ? '👤 Atendimento Humano Assumido' : '🤖 IA Reativada',
      descricao: action === 'assume'
        ? 'O corretor assumiu o controle manual da conversa. Respostas automáticas da IA pausadas por 24h.'
        : 'O corretor reativou as respostas automáticas e monitoramento da IA.',
      data_hora: nowIso,
      status: 'realizado'
    }]);

    return NextResponse.json({
      success: true,
      state: newState,
      is_human_handoff: action === 'assume',
      message: action === 'assume' ? 'Atendimento humano assumido com sucesso' : 'IA reativada com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro no POST /api/leads/[id]/handoff:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
