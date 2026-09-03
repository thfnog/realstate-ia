import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getCaptacaoRepository } from '@/lib/repositories/factory';
import { getAuthFromCookies } from '@/lib/auth';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const tipo = searchParams.get('tipo') || undefined;
    const origem = searchParams.get('origem') || undefined;
    const corretor_id = searchParams.get('corretor_id') || (session.app_role === 'corretor' ? (session.corretor_id || undefined) : undefined);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const isAdmin = session.app_role === 'admin' || session.app_role === 'master';
    const client = isAdmin ? supabaseAdmin : getUserSupabaseClient(token);
    const repository = getCaptacaoRepository(client);

    const { data, count } = await repository.findAll({
      imobiliaria_id: session.imobiliaria_id,
      status,
      tipo,
      origem,
      corretor_id,
      search,
      page,
      limit
    });

    return NextResponse.json({ data, count, page, limit });
  } catch (err: any) {
    console.error('Error GET /api/captacoes:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    if (!body.titulo) {
      return NextResponse.json({ error: 'Título do imóvel é obrigatório' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getCaptacaoRepository(client);

    const captacaoData = {
      imobiliaria_id: session.imobiliaria_id,
      corretor_id: body.corretor_id || session.corretor_id || null,
      imovel_id: body.imovel_id || null,
      titulo: body.titulo,
      tipo: body.tipo || 'apartamento',
      finalidade: body.finalidade || 'venda',
      status: body.status || 'prospeccao',
      origem: body.origem || 'manual',
      proprietario_nome: body.proprietario_nome || null,
      proprietario_telefone: body.proprietario_telefone || null,
      proprietario_email: body.proprietario_email || null,
      distrito: body.distrito || 'SP',
      concelho: body.concelho || 'São Paulo',
      freguesia: body.freguesia || null,
      rua: body.rua || null,
      numero: body.numero || null,
      complemento: body.complemento || null,
      codigo_postal: body.codigo_postal || null,
      area_util: body.area_util ? Number(body.area_util) : null,
      area_total: body.area_total ? Number(body.area_total) : null,
      quartos: body.quartos ? Number(body.quartos) : null,
      suites: body.suites ? Number(body.suites) : null,
      banheiros: body.banheiros ? Number(body.banheiros) : null,
      vagas: body.vagas ? Number(body.vagas) : null,
      valor_estimado: body.valor_estimado ? Number(body.valor_estimado) : null,
      valor_locacao_estimado: body.valor_locacao_estimado ? Number(body.valor_locacao_estimado) : null,
      condominio_estimado: body.condominio_estimado ? Number(body.condominio_estimado) : null,
      iptu_estimado: body.iptu_estimado ? Number(body.iptu_estimado) : null,
      descricao: body.descricao || null,
      observacoes: body.observacoes || null,
      fotos: Array.isArray(body.fotos) ? body.fotos : [],
      dados_ia: body.dados_ia || null
    };

    const novaCaptacao = await repository.create(captacaoData);

    return NextResponse.json(novaCaptacao, { status: 201 });
  } catch (err: any) {
    console.error('Error POST /api/captacoes:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
