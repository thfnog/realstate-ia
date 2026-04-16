import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import { getConfig } from '@/lib/countryConfig';
import type { Moeda } from '@/lib/database.types';
import { getAuthFromCookies } from '@/lib/auth';

// GET: List all properties
export async function GET(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  if (mock.isMockMode()) {
    mock.seedTestData();
    const imoveis = mock.getImoveis(status || undefined);
    return NextResponse.json(imoveis.filter(i => i.imobiliaria_id === session.imobiliaria_id));
  }

  let query = supabaseAdmin
    .from('imoveis')
    .select('*')
    .eq('imobiliaria_id', session.imobiliaria_id)
    .order('criado_em', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: Create a new property
export async function POST(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await request.json();

    if (mock.isMockMode()) {
      const imovel = mock.createImovel({
        imobiliaria_id: session.imobiliaria_id,
        tipo: body.tipo,
        bairro: body.bairro,
        valor: body.valor,
        area_m2: body.area_m2 || null,
        quartos: body.quartos || null,
        vagas: body.vagas || 0,
        status: body.status || 'disponivel',
        link_fotos: body.link_fotos || null,
        moeda: body.moeda || (getConfig().currency.code as Moeda),
      });
      return NextResponse.json(imovel, { status: 201 });
    }

    const { data, error } = await supabaseAdmin
      .from('imoveis')
      .insert({
        imobiliaria_id: session.imobiliaria_id,
        tipo: body.tipo,
        bairro: body.bairro,
        valor: body.valor,
        area_m2: body.area_m2 || null,
        quartos: body.quartos || null,
        vagas: body.vagas || 0,
        status: body.status || 'disponivel',
        link_fotos: body.link_fotos || null,
        moeda: body.moeda || (getConfig().currency.code as Moeda),
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
