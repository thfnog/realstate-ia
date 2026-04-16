import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';

// PATCH: Update an event status or details
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (mock.isMockMode()) {
      const evento = mock.updateEvento(id, body);
      if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
      return NextResponse.json(evento);
    }

    const { data, error } = await supabaseAdmin
      .from('eventos')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE: Remove an event
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (mock.isMockMode()) {
      const success = mock.deleteEvento(id);
      if (!success) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    const { error } = await supabaseAdmin.from('eventos').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
