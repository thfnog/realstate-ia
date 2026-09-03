import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getCaptacaoRepository, getImovelRepository } from '@/lib/repositories/factory';
import { getAuthFromCookies } from '@/lib/auth';
import { matchLeadsForProperty } from '@/lib/engine/reverseMatching';
import { getConfig } from '@/lib/countryConfig';
import type { Moeda, TipoImovel } from '@/lib/database.types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

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
    const isAdmin = session.app_role === 'admin' || session.app_role === 'master';
    const client = isAdmin ? supabaseAdmin : getUserSupabaseClient(token);
    const repository = getCaptacaoRepository(client);

    const captacao = await repository.findById(id, session.imobiliaria_id);
    if (!captacao) {
      return NextResponse.json({ error: 'Captação não encontrada' }, { status: 404 });
    }

    return NextResponse.json(captacao);
  } catch (err: any) {
    console.error('Error GET /api/captacoes/[id]:', err);
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
    const isAdmin = session.app_role === 'admin' || session.app_role === 'master';
    const client = isAdmin ? supabaseAdmin : getUserSupabaseClient(token);
    const captacaoRepo = getCaptacaoRepository(client);

    const existing = await captacaoRepo.findById(id, session.imobiliaria_id);
    if (!existing) {
      return NextResponse.json({ error: 'Captação não encontrada' }, { status: 404 });
    }

    let imovelCriado = null;

    // Se a ação for publicar ou status mudou para 'publicado' e ainda não tem imóvel gerado
    if ((body.status === 'publicado' || body.action === 'publicar') && !existing.imovel_id) {
      const imovelRepo = getImovelRepository(client);
      
      const config = getConfig();
      const moeda = config.currency.code as Moeda;

      const imovelData = {
        imobiliaria_id: session.imobiliaria_id,
        titulo: body.titulo || existing.titulo,
        tipo: (body.tipo || existing.tipo) as TipoImovel,
        pais: config.code,
        distrito: body.distrito || existing.distrito || 'SP',
        concelho: body.concelho || existing.concelho || 'São Paulo',
        freguesia: body.freguesia || existing.freguesia || 'Centro',
        rua: body.rua || existing.rua || null,
        numero: body.numero || existing.numero || null,
        complemento: body.complemento || existing.complemento || null,
        codigo_postal: body.codigo_postal || existing.codigo_postal || null,
        latitude: null,
        longitude: null,
        finalidade: (body.finalidade || existing.finalidade || 'venda') as any,
        negocio: 'residencial' as const,
        empreendimento: null,
        corretor_id: body.corretor_id || existing.corretor_id || null,
        data_captacao: existing.criado_em || new Date().toISOString(),
        origem_captacao: existing.origem || 'whatsapp_corretor',
        proprietario_nome: body.proprietario_nome || existing.proprietario_nome || null,
        proprietario_telefone: body.proprietario_telefone || existing.proprietario_telefone || null,
        proprietario_email: body.proprietario_email || existing.proprietario_email || null,
        area_util: body.area_util ?? existing.area_util ?? null,
        area_construida: body.area_total ?? existing.area_total ?? null,
        area_privativa: body.area_util ?? existing.area_util ?? null,
        area_terreno: body.area_total ?? existing.area_total ?? null,
        area_bruta: body.area_total ?? existing.area_total ?? null,
        quartos: body.quartos ?? existing.quartos ?? null,
        suites: body.suites ?? existing.suites ?? null,
        casas_banho: body.banheiros ?? existing.banheiros ?? null,
        salas: 1,
        vagas_garagem: body.vagas ?? existing.vagas ?? 0,
        andar: null,
        num_andares: null,
        num_torres: null,
        ano_construcao: null,
        estado_conservacao: null,
        certificado_energetico: null,
        orientacao_solar: null,
        comodidades: [],
        comodidades_condominio: [],
        valor: body.valor_estimado ? Number(body.valor_estimado) : (existing.valor_estimado ? Number(existing.valor_estimado) : 0),
        valor_locacao: body.valor_locacao_estimado ? Number(body.valor_locacao_estimado) : (existing.valor_locacao_estimado ? Number(existing.valor_locacao_estimado) : null),
        moeda,
        valor_avaliacao: null,
        imi_iptu_anual: body.iptu_estimado ? Number(body.iptu_estimado) : (existing.iptu_estimado ? Number(existing.iptu_estimado) : null),
        condominio_mensal: body.condominio_estimado ? Number(body.condominio_estimado) : (existing.condominio_estimado ? Number(existing.condominio_estimado) : null),
        seguro_incendio_mensal: null,
        taxa_administracao_pct: null,
        aceita_permuta: false,
        aceita_financiamento: true,
        descricao: body.descricao || existing.descricao || null,
        pontos_venda: [],
        observacoes_internas: body.observacoes || existing.observacoes || null,
        video_url: null,
        tour_360_url: null,
        status: 'disponivel' as const,
        fotos: (existing.fotos || []).map((url, idx) => ({
          id: `foto-${idx}`,
          url_thumb: url,
          url_media: url,
          url_original: url,
          ordem: idx,
          is_capa: idx === 0
        }))
      };

      imovelCriado = await imovelRepo.create(imovelData);
      body.imovel_id = imovelCriado.id;
      body.status = 'publicado';

      // Executa Reverse Matching
      try {
        await matchLeadsForProperty(imovelCriado);
      } catch (rmErr) {
        console.error('Erro ao rodar Reverse Matching após publicação:', rmErr);
      }
    }

    const { action: _, ...dataToUpdate } = body;
    const updated = await captacaoRepo.update(id, session.imobiliaria_id, dataToUpdate);

    return NextResponse.json({
      success: true,
      captacao: updated,
      imovel: imovelCriado
    });
  } catch (err: any) {
    console.error('Error PATCH /api/captacoes/[id]:', err);
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
    const isAdmin = session.app_role === 'admin' || session.app_role === 'master';
    const client = isAdmin ? supabaseAdmin : getUserSupabaseClient(token);
    const repository = getCaptacaoRepository(client);

    await repository.delete(id, session.imobiliaria_id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error DELETE /api/captacoes/[id]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
