import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';

// PUT: Update a property
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (mock.isMockMode()) {
      const updated = mock.updateImovel(id, {
        tipo: body.tipo,
        bairro: body.bairro,
        valor: body.valor,
        area_m2: body.area_m2 || null,
        quartos: body.quartos || null,
        vagas: body.vagas ?? 0,
        status: body.status,
        link_fotos: body.link_fotos || null,
      });
      if (!updated) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      return NextResponse.json(updated);
    }

    const { data, error } = await supabaseAdmin
      .from('imoveis')
      .update({
        tipo: body.tipo,
        bairro: body.bairro,
        valor: body.valor,
        area_m2: body.area_m2 || null,
        quartos: body.quartos || null,
        vagas: body.vagas ?? 0,
        status: body.status,
        link_fotos: body.link_fotos || null,
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

// DELETE: Delete a property
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (mock.isMockMode()) {
      mock.deleteImovel(id);
      return NextResponse.json({ success: true });
    }

    const { error } = await supabaseAdmin
      .from('imoveis')
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
