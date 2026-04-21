import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import type { StatusLead } from '@/lib/database.types';

// GET: Get lead details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (mock.isMockMode()) {
      const lead = mock.getLeadById(id);
      if (!lead) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      return NextResponse.json(lead);
    }

    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .select('*, corretores(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!lead) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (err) {
    console.error('SERVER ERROR GET LEAD:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PATCH: Update lead status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (mock.isMockMode()) {
      const updateData: Record<string, unknown> = {};
      if (body.status) updateData.status = body.status as StatusLead;
      if (body.corretor_id !== undefined) updateData.corretor_id = body.corretor_id;
      
      const updated = mock.updateLead(id, updateData);
      if (!updated) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

      // Cascade to events in Mock
      if (body.corretor_id !== undefined) {
         const allEvts = mock.getEventos(id);
         allEvts.forEach(evt => {
           if (evt.status !== 'cancelado') {
             mock.updateEvento(evt.id, { corretor_id: body.corretor_id });
           }
         });
      }

      return NextResponse.json(updated);
    }

    const updateData: Record<string, any> = {};
    if (body.status) updateData.status = body.status;
    if (body.corretor_id !== undefined) updateData.corretor_id = body.corretor_id;

    let updatedLead;
    let queryError;

    if (Object.keys(updateData).length > 0) {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .update(updateData)
        .eq('id', id)
        .select('*, corretores(*)')
        .maybeSingle();
      updatedLead = data;
      queryError = error;
    } else {
      // If no updates but possibly a trigger (like resend_briefing)
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('*, corretores(*)')
        .eq('id', id)
        .maybeSingle();
      updatedLead = data;
      queryError = error;
    }

    if (queryError) {
      console.error('Supabase query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!updatedLead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    // Cascade to events in Supabase
    if (body.corretor_id !== undefined) {
      await supabaseAdmin
        .from('eventos')
        .update({ corretor_id: body.corretor_id })
        .eq('lead_id', id)
        .neq('status', 'cancelado');
    }

    // 🚀 Handle Resend Briefing
    if (body.resend_briefing) {
       const { processLead } = await import('@/lib/engine/processLead');
       // Trigger processing (re-run logic)
       // We enable auto-reply check as well to ensure total flow for testing
       await processLead(updatedLead as any, { forceAutoReply: body.resend_briefing });
    }

    return NextResponse.json(updatedLead);
  } catch (err) {
    console.error('Erro ao atualizar lead:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 });
  }
}

// DELETE: Delete lead
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (mock.isMockMode()) {
      const deleted = mock.deleteLead(id);
      if (!deleted) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    // Delete associated events first in Supabase if needed (though normally handled by FK CASCADE)
    // For safety with supabaseAdmin:
    await supabaseAdmin
      .from('eventos')
      .delete()
      .eq('lead_id', id);

    const { error } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar lead:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
