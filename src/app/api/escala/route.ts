import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import { getAuthFromCookies } from '@/lib/auth';

// GET: Get schedule entries for a date range
export async function GET(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end');

  if (mock.isMockMode()) {
    mock.seedTestData();
    const escalas = mock.getEscala(startDate || undefined, endDate || undefined);
    return NextResponse.json(escalas.filter(e => e.imobiliaria_id === session.imobiliaria_id));
  }

  let query = supabaseAdmin
    .from('escala')
    .select('*, corretores(*)')
    .eq('imobiliaria_id', session.imobiliaria_id)
    .order('data', { ascending: true });

  if (startDate) query = query.gte('data', startDate);
  if (endDate) query = query.lte('data', endDate);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: Add a broker to a duty day
export async function POST(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await request.json();

    if (!body.corretor_id || !body.data) {
      return NextResponse.json(
        { error: 'corretor_id e data são obrigatórios' },
        { status: 400 }
      );
    }

    if (mock.isMockMode()) {
      const result = mock.createEscala({ imobiliaria_id: session.imobiliaria_id, corretor_id: body.corretor_id, data: body.data });
      if ('error' in result) {
        return NextResponse.json(
          { error: 'Este corretor já está escalado neste dia' },
          { status: 409 }
        );
      }
      return NextResponse.json(result, { status: 201 });
    }

    const { data, error } = await supabaseAdmin
      .from('escala')
      .insert({
        imobiliaria_id: session.imobiliaria_id,
        corretor_id: body.corretor_id,
        data: body.data,
      })
      .select('*, corretores(*)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Este corretor já está escalado neste dia' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE: Remove a schedule entry
export async function DELETE(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      );
    }

    if (mock.isMockMode()) {
      mock.deleteEscala(id);
      return NextResponse.json({ success: true });
    }

    const { error } = await supabaseAdmin
      .from('escala')
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
