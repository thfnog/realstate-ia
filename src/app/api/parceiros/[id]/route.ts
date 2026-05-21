import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getParceiroRepository } from '@/lib/repositories/factory';
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
    const repository = getParceiroRepository(client);

    const parceiro = await repository.findById(id, session.imobiliaria_id);
    if (!parceiro) {
      return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
    }

    return NextResponse.json(parceiro);
  } catch (err: any) {
    console.error('Error GET /api/parceiros/[id]:', err);
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
    const repository = getParceiroRepository(client);

    const updateData: Record<string, any> = {};
    if (body.nome !== undefined) updateData.nome = body.nome;
    if (body.telefone !== undefined) updateData.telefone = body.telefone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.creci !== undefined) updateData.creci = body.creci;
    if (body.imobiliaria_nome !== undefined) updateData.imobiliaria_nome = body.imobiliaria_nome;
    if (body.notas !== undefined) updateData.notas = body.notas;
    if (body.ativo !== undefined) updateData.ativo = body.ativo;

    const parceiro = await repository.update(id, session.imobiliaria_id, updateData);
    return NextResponse.json(parceiro);
  } catch (err: any) {
    console.error('Error PATCH /api/parceiros/[id]:', err);
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
    const repository = getParceiroRepository(client);

    await repository.delete(id, session.imobiliaria_id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error DELETE /api/parceiros/[id]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
