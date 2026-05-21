import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getOportunidadeRepository } from '@/lib/repositories/factory';
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
    const repository = getOportunidadeRepository(client);

    const oportunidade = await repository.findById(id, session.imobiliaria_id);
    if (!oportunidade) {
      return NextResponse.json({ error: 'Oportunidade não encontrada' }, { status: 404 });
    }

    return NextResponse.json(oportunidade);
  } catch (err: any) {
    console.error('Error GET /api/oportunidades/[id]:', err);
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
    const repository = getOportunidadeRepository(client);

    const updateData: Record<string, any> = {};
    if (body.titulo !== undefined) updateData.titulo = body.titulo;
    if (body.descricao !== undefined) updateData.descricao = body.descricao;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.corretor_id !== undefined) updateData.corretor_id = body.corretor_id;
    if (body.imovel_id !== undefined) updateData.imovel_id = body.imovel_id;
    if (body.valor_estimado !== undefined) updateData.valor_estimado = body.valor_estimado;
    if (body.comissao_parceiro !== undefined) updateData.comissao_parceiro = body.comissao_parceiro;

    const oportunidade = await repository.update(id, session.imobiliaria_id, updateData);
    return NextResponse.json(oportunidade);
  } catch (err: any) {
    console.error('Error PATCH /api/oportunidades/[id]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(
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
    const repository = getOportunidadeRepository(client);

    await repository.delete(id, session.imobiliaria_id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error DELETE /api/oportunidades/[id]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
