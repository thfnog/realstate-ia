import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';

// GET: Fetch a single property
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (mock.isMockMode()) {
      mock.seedTestData();
      const imovel = mock.getImovelById(id);
      if (!imovel) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      return NextResponse.json(imovel);
    }

    const { data, error } = await supabaseAdmin
      .from('imoveis')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT: Update a property
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const imovelData = {
      titulo: body.titulo,
      tipo: body.tipo,
      pais: body.pais,
      distrito: body.distrito,
      concelho: body.concelho,
      freguesia: body.freguesia,
      rua: body.rua,
      numero: body.numero,
      codigo_postal: body.codigo_postal,
      latitude: body.latitude,
      longitude: body.longitude,
      finalidade: body.finalidade,
      negocio: body.negocio,
      corretor_id: body.corretor_id,
      area_bruta: body.area_bruta,
      area_util: body.area_util,
      area_terreno: body.area_terreno,
      quartos: body.quartos,
      suites: body.suites,
      casas_banho: body.casas_banho,
      vagas_garagem: body.vagas_garagem,
      andar: body.andar,
      ano_construcao: body.ano_construcao,
      estado_conservacao: body.estado_conservacao,
      certificado_energetico: body.certificado_energetico,
      orientacao_solar: body.orientacao_solar,
      comodidades: body.comodidades,
      valor: body.valor,
      moeda: body.moeda,
      valor_avaliacao: body.valor_avaliacao,
      imi_iptu_anual: body.imi_iptu_anual,
      condominio_mensal: body.condominio_mensal,
      aceita_permuta: body.aceita_permuta,
      aceita_financiamento: body.aceita_financiamento,
      descricao: body.descricao,
      pontos_venda: body.pontos_venda,
      observacoes_internas: body.observacoes_internas,
      status: body.status,
      fotos: body.fotos,
    };

    if (mock.isMockMode()) {
      const updated = mock.updateImovel(id, imovelData as any);
      if (!updated) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      return NextResponse.json(updated);
    }

    const { data, error } = await supabaseAdmin
      .from('imoveis')
      .update(imovelData)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('API PUT Error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE: Delete a property
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (mock.isMockMode()) {
      mock.deleteImovel(id);
      return NextResponse.json({ success: true });
    }

    const { error } = await supabaseAdmin
      .from('imoveis')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
