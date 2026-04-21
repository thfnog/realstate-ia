import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';

// PUT: Update a broker
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (mock.isMockMode()) {
      const updated = mock.updateCorretor(id, {
        nome: body.nome,
        telefone: body.telefone,
        email: body.email || null,
        ativo: body.ativo ?? true,
      });
      if (!updated) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      return NextResponse.json(updated);
    }

    const { data, error } = await supabaseAdmin
      .from('corretores')
      .update({
        nome: body.nome,
        telefone: body.telefone,
        email: body.email || null,
        ativo: body.ativo ?? true,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE: Delete a broker
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (mock.isMockMode()) {
      mock.deleteCorretor(id);
      return NextResponse.json({ success: true });
    }

    const { error } = await supabaseAdmin
      .from('corretores')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PATCH: Partial update (e.g., whatsapp_status)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (mock.isMockMode()) {
      const updated = mock.updateCorretor(id, body);
      if (!updated) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      return NextResponse.json(updated);
    }

    const { data, error } = await supabaseAdmin
      .from('corretores')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
