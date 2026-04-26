import { NextResponse } from 'next/server';
import { getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getImovelRepository } from '@/lib/repositories/factory';
import { getConfig } from '@/lib/countryConfig';
import type { Moeda } from '@/lib/database.types';
import { getAuthFromCookies } from '@/lib/auth';

// GET: List all properties
export async function GET(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  const status = searchParams.get('status') || undefined;
  const tipo = searchParams.get('tipo') || undefined;
  const min_valor = searchParams.get('min_valor') ? parseInt(searchParams.get('min_valor')!) : undefined;
  const max_valor = searchParams.get('max_valor') ? parseInt(searchParams.get('max_valor')!) : undefined;
  const min_area = searchParams.get('min_area') ? parseInt(searchParams.get('min_area')!) : undefined;
  const max_area = searchParams.get('max_area') ? parseInt(searchParams.get('max_area')!) : undefined;
  const search = searchParams.get('search') || undefined;

  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value || '';
  const client = getUserSupabaseClient(token);
  const repository = getImovelRepository(client);

  const { data, count } = await repository.findAll({
    imobiliaria_id: session.imobiliaria_id,
    page,
    limit,
    status,
    tipo,
    min_valor,
    max_valor,
    min_area,
    max_area,
    search
  });

  return NextResponse.json({ data, count });
}

// POST: Create a new property
export async function POST(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await request.json();

    const imovelData = {
      imobiliaria_id: session.imobiliaria_id,
      titulo: body.titulo,
      tipo: body.tipo,
      pais: body.pais || (getConfig().code),
      distrito: body.distrito,
      concelho: body.concelho,
      freguesia: body.freguesia,
      rua: body.rua,
      numero: body.numero,
      codigo_postal: body.codigo_postal,
      latitude: body.latitude,
      longitude: body.longitude,
      finalidade: body.finalidade || 'venda',
      negocio: body.negocio || 'residencial',
      corretor_id: body.corretor_id || null,
      data_captacao: body.data_captacao || new Date().toISOString(),
      origem_captacao: body.origem_captacao || 'manual',
      area_bruta: body.area_bruta || null,
      area_util: body.area_util || null,
      area_terreno: body.area_terreno || null,
      quartos: body.quartos || null,
      suites: body.suites || null,
      casas_banho: body.casas_banho || null,
      vagas_garagem: body.vagas_garagem || 0,
      andar: body.andar || null,
      ano_construcao: body.ano_construcao || null,
      estado_conservacao: body.estado_conservacao || null,
      certificado_energetico: body.certificado_energetico || null,
      orientacao_solar: body.orientacao_solar || null,
      comodidades: body.comodidades || [],
      valor: body.valor,
      moeda: body.moeda || (getConfig().currency.code as Moeda),
      valor_avaliacao: body.valor_avaliacao || null,
      imi_iptu_anual: body.imi_iptu_anual || null,
      condominio_mensal: body.condominio_mensal || null,
      aceita_permuta: body.aceita_permuta || false,
      aceita_financiamento: body.aceita_financiamento || true,
      descricao: body.descricao || null,
      pontos_venda: body.pontos_venda || [],
      observacoes_internas: body.observacoes_internas || null,
      status: body.status || 'disponivel',
      fotos: body.fotos || [],
    };

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getImovelRepository(client);

    const imovel = await repository.create(imovelData);

    // Step 2: Trigger Reverse Matching (Async)
    import('@/lib/engine/reverseMatching').then(({ matchLeadsForProperty }) => {
      matchLeadsForProperty(imovel);
    }).catch(e => console.error('Erro ao disparar match reverso:', e));

    return NextResponse.json(imovel, { status: 201 });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
