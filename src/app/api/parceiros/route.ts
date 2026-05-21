import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getParceiroRepository } from '@/lib/repositories/factory';
import { getAuthFromCookies } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const ativoParam = searchParams.get('ativo');
    const ativo = ativoParam === 'true' ? true : ativoParam === 'false' ? false : undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const isAdmin = session.app_role === 'admin' || session.app_role === 'master';
    const client = isAdmin ? supabaseAdmin : getUserSupabaseClient(token);
    const repository = getParceiroRepository(client);

    const { data, count } = await repository.findAll({
      imobiliaria_id: session.imobiliaria_id,
      search,
      ativo,
      page,
      limit
    });

    return NextResponse.json({ data, count, page, limit });
  } catch (err: any) {
    console.error('Error GET /api/parceiros:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    if (!body.nome || !body.telefone) {
      return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getParceiroRepository(client);

    const parceiro = await repository.create({
      imobiliaria_id: session.imobiliaria_id,
      nome: body.nome,
      telefone: body.telefone,
      email: body.email || null,
      creci: body.creci || null,
      imobiliaria_nome: body.imobiliaria_nome || null,
      notas: body.notas || null,
      ativo: body.ativo ?? true
    });

    return NextResponse.json(parceiro, { status: 201 });
  } catch (err: any) {
    console.error('Error POST /api/parceiros:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
