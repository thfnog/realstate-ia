import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import type { StatusLead } from '@/lib/database.types';

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

    const updateData: Record<string, unknown> = {};
    if (body.status) updateData.status = body.status;
    if (body.corretor_id !== undefined) updateData.corretor_id = body.corretor_id;

    const { data: updatedLead, error } = await supabaseAdmin
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select('*, corretores(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Cascade to events in Supabase
    if (body.corretor_id !== undefined) {
      await supabaseAdmin
        .from('eventos')
        .update({ corretor_id: body.corretor_id })
        .eq('lead_id', id)
        .neq('status', 'cancelado');
    }

    return NextResponse.json(updatedLead);
  } catch (err) {
    console.error('Erro ao atualizar lead:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
