import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getAuthFromCookies } from '@/lib/auth';
import { getContratoRepository } from '@/lib/repositories/factory';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repo = getContratoRepository(client);
    
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') as any;
    const tipo = searchParams.get('tipo') as any;

    const data = await repo.findAll({ 
      imobiliaria_id: session.imobiliaria_id,
      status,
      tipo
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repo = getContratoRepository(client);

    const body = await req.json();
    const contrato = await repo.create({
      ...body,
      imobiliaria_id: session.imobiliaria_id,
    });

    // If it's a rental, we generate the first payment (caucao) and optionally the first month
    if (contrato.tipo === 'aluguel') {
      await repo.createPagamento({
        contrato_id: contrato.id,
        tipo: 'entrada',
        valor_esperado: contrato.valor_entrada_caucao || contrato.valor_total,
        valor_pago: 0,
        data_vencimento: contrato.data_inicio,
        data_pagamento: null,
        status: 'pendente'
      });
    } else if (contrato.tipo === 'venda' && contrato.valor_entrada_caucao > 0) {
      await repo.createPagamento({
        contrato_id: contrato.id,
        tipo: 'entrada',
        valor_esperado: contrato.valor_entrada_caucao,
        valor_pago: 0,
        data_vencimento: contrato.data_inicio,
        data_pagamento: null,
        status: 'pendente'
      });
    }

    return NextResponse.json(contrato, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
