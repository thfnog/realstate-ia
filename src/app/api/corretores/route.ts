import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import { getAuthFromCookies } from '@/lib/auth';

// GET: List all brokers
export async function GET() {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (mock.isMockMode()) {
    mock.seedTestData();
    const corretores = mock.getCorretores();
    return NextResponse.json(corretores.filter(c => c.imobiliaria_id === session.imobiliaria_id));
  }

  const { data, error } = await supabaseAdmin
    .from('corretores')
    .select('*')
    .eq('imobiliaria_id', session.imobiliaria_id)
    .order('criado_em', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: Create a new broker
export async function POST(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    const body = await request.json();

    if (!body.nome || !body.telefone) {
      return NextResponse.json(
        { error: 'Nome e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    if (mock.isMockMode()) {
      const corretor = mock.createCorretor({
        imobiliaria_id: session.imobiliaria_id,
        nome: body.nome,
        telefone: body.telefone,
        email: body.email || null,
        ativo: body.ativo ?? true,
      });
      return NextResponse.json(corretor, { status: 201 });
    }

    const { data, error } = await supabaseAdmin
      .from('corretores')
      .insert({
        imobiliaria_id: session.imobiliaria_id,
        nome: body.nome,
        telefone: body.telefone,
        email: body.email || null,
        ativo: body.ativo ?? true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
