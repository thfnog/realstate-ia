import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getOportunidadeRepository } from '@/lib/repositories/factory';
import { getAuthFromCookies } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const parceiro_id = searchParams.get('parceiro_id') || undefined;
    const corretor_id = searchParams.get('corretor_id') || (session.app_role === 'corretor' ? (session.corretor_id || undefined) : undefined);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const isAdmin = session.app_role === 'admin' || session.app_role === 'master';
    const client = isAdmin ? supabaseAdmin : getUserSupabaseClient(token);
    const repository = getOportunidadeRepository(client);

    const { data, count } = await repository.findAll({
      imobiliaria_id: session.imobiliaria_id,
      status,
      parceiro_id,
      corretor_id,
      search,
      page,
      limit
    });

    return NextResponse.json({ data, count, page, limit });
  } catch (err: any) {
    console.error('Error GET /api/oportunidades:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    if (!body.titulo || !body.parceiro_id) {
      return NextResponse.json({ error: 'Título e ID do parceiro são obrigatórios' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getOportunidadeRepository(client);

    const oportunidade = await repository.create({
      imobiliaria_id: session.imobiliaria_id,
      parceiro_id: body.parceiro_id,
      corretor_id: body.corretor_id || session.corretor_id || null,
      imovel_id: body.imovel_id || null,
      lead_id: body.lead_id || null,
      titulo: body.titulo,
      descricao: body.descricao || null,
      valor_estimado: body.valor_estimado || null,
      comissao_parceiro: body.comissao_parceiro || null,
      status: body.status || 'nova'
    });

    return NextResponse.json(oportunidade, { status: 201 });
  } catch (err: any) {
    console.error('Error POST /api/oportunidades:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
