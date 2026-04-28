import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/leads/[id]/feedback
 * Marks a lead as "Not a Lead", saves the text for AI training, and deletes the lead.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Get the lead data
    const { data: lead, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('text, imobiliaria_id, descricao_interesse')
      .eq('id', id)
      .single();

    if (fetchError || !lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    // Use the description or the raw text if available
    const feedbackText = lead.descricao_interesse || lead.text || '';

    if (!feedbackText) {
      return NextResponse.json({ error: 'Nenhum texto associado a este lead para treinamento' }, { status: 400 });
    }

    // 2. Save to feedback table
    const { error: feedbackError } = await supabaseAdmin
      .from('ai_feedback')
      .insert({
        imobiliaria_id: lead.imobiliaria_id,
        text: feedbackText,
        is_lead_actual: false
      });

    if (feedbackError) {
      console.error('Erro ao salvar feedback:', feedbackError);
      return NextResponse.json({ error: 'Erro ao salvar feedback no banco' }, { status: 500 });
    }

    // 3. Delete the lead
    const { error: deleteError } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir lead após feedback:', deleteError);
    }

    return NextResponse.json({ success: true, message: 'Feedback registrado e lead removido.' });
  } catch (error) {
    console.error('Erro no endpoint de feedback:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
