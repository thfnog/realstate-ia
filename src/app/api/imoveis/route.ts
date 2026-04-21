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
  const corretor_id = searchParams.get('corretor_id');

  if (mock.isMockMode()) {
    mock.seedTestData();
    let imoveis = mock.getImoveis(status || undefined);
    
    // Multi-tenant filtering
    imoveis = imoveis.filter(i => i.imobiliaria_id === session.imobiliaria_id);
    
    // Filter by broker if requested (e.g. "My properties")
    if (corretor_id) {
       imoveis = imoveis.filter(i => i.corretor_id === corretor_id);
    }

    return NextResponse.json(imoveis);
  }

  let query = supabaseAdmin
    .from('imoveis')
    .select('*')
    .eq('imobiliaria_id', session.imobiliaria_id)
    .order('criado_em', { ascending: false });

  if (status) query = query.eq('status', status);
  if (corretor_id) query = query.eq('corretor_id', corretor_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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

    if (mock.isMockMode()) {
      const imovel = mock.createImovel(imovelData);
      return NextResponse.json(imovel, { status: 201 });
    }

    const { data, error } = await supabaseAdmin
      .from('imoveis')
      .insert(imovelData)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Step 2: Trigger Reverse Matching (Async)
    // No await here because we don't want to delay the API response
    import('@/lib/engine/reverseMatching').then(({ matchLeadsForProperty }) => {
      matchLeadsForProperty(data);
    }).catch(e => console.error('Erro ao disparar match reverso:', e));

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
