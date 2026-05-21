import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getLeadRepository } from '@/lib/repositories/factory';
import { getAuthFromCookies } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getLeadRepository(client);

    const lead = await repository.findById(id, session.imobiliaria_id);
    if (!lead) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (err: any) {
    console.error('Error GET /api/clientes/[id]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getLeadRepository(client);

    const updateData: Record<string, any> = {};
    if (body.nome !== undefined) updateData.nome = body.nome;
    if (body.telefone !== undefined) updateData.telefone = body.telefone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.orcamento !== undefined) updateData.orcamento = body.orcamento;
    if (body.quartos_interesse !== undefined) updateData.quartos_interesse = body.quartos_interesse;
    if (body.vagas_interesse !== undefined) updateData.vagas_interesse = body.vagas_interesse;
    if (body.area_interesse !== undefined) updateData.area_interesse = body.area_interesse;
    if (body.bairros_interesse !== undefined) updateData.bairros_interesse = body.bairros_interesse;
    if (body.tipo_interesse !== undefined) updateData.tipo_interesse = body.tipo_interesse;
    if (body.finalidade !== undefined) updateData.finalidade = body.finalidade;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.corretor_id !== undefined) updateData.corretor_id = body.corretor_id;
    if (body.descricao_interesse !== undefined) updateData.descricao_interesse = body.descricao_interesse;
    if (body.observacoes !== undefined) updateData.observacoes = body.observacoes;
    if (body.classificacao !== undefined) updateData.classificacao = body.classificacao;
    if (body.classificacao_motivo !== undefined) updateData.classificacao_motivo = body.classificacao_motivo;

    const lead = await repository.update(id, session.imobiliaria_id, updateData);
    return NextResponse.json(lead);
  } catch (err: any) {
    console.error('Error PATCH /api/clientes/[id]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
