import { NextResponse } from 'next/server';
import { getUserSupabaseClient, supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getAuthFromCookies } from '@/lib/auth';
import { getCaptacaoRepository, getImovelRepository, getCorretorRepository } from '@/lib/repositories/factory';
import { isMockMode, getImobiliariaById, DEFAULT_IMOBILIARIA_ID } from '@/lib/mockDb';
import { montarDadosAutorizacao, gerarHTMLAutorizacao } from '@/lib/imoveis/autorizacaoCaptacao';
import { Imobiliaria, Corretor } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'html';
    const exclusividade = searchParams.get('exclusividade') !== 'false';
    const prazoDias = searchParams.get('prazo_dias') ? parseInt(searchParams.get('prazo_dias')!) : undefined;
    const comissaoPct = searchParams.get('comissao_pct') ? parseFloat(searchParams.get('comissao_pct')!) : undefined;
    const proprietarioCpf = searchParams.get('proprietario_cpf') || undefined;
    const matricula = searchParams.get('matricula') || undefined;

    // 1. Obter sessão ou token
    const session = await getAuthFromCookies();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    
    const imobiliariaId = session?.imobiliaria_id || searchParams.get('imobiliaria_id') || DEFAULT_IMOBILIARIA_ID;
    const client = session?.app_role === 'admin' || session?.app_role === 'master' 
      ? supabaseAdmin 
      : (token ? getUserSupabaseClient(token) : supabaseAdmin);

    const captacaoRepo = getCaptacaoRepository(client);
    const imovelRepo = getImovelRepository(client);
    const corretorRepo = getCorretorRepository(client);

    // 2. Buscar Captação
    const captacao = await captacaoRepo.findById(id, imobiliariaId);
    if (!captacao) {
      return new Response(
        `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Captação não encontrada</title><style>body{font-family:sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b;}</style></head><body><h1>Captação não encontrada</h1><p>Não foi possível localizar o registro para geração do termo de autorização.</p></body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // 3. Buscar Imóvel vinculado se houver
    let imovel = null;
    if (captacao.imovel_id) {
      try {
        imovel = await imovelRepo.findById(captacao.imovel_id, imobiliariaId);
      } catch {
        imovel = null;
      }
    }

    // 4. Buscar dados da Imobiliária
    let imobiliaria: Imobiliaria;
    if (isMockMode()) {
      imobiliaria = getImobiliariaById(captacao.imobiliaria_id) || getImobiliariaById(DEFAULT_IMOBILIARIA_ID) || {
        id: captacao.imobiliaria_id || DEFAULT_IMOBILIARIA_ID,
        nome_fantasia: 'Imobiliária ImobIA',
        identificador_fiscal: 'CNPJ 12.345.678/0001-90',
        numero_registro: 'CRECI 45678-J',
        plano: 'profissional',
        config_pais: 'BR',
        delay_auto_reply_sec: 20,
        config_lembrete_1_horas: 24,
        config_lembrete_2_horas: 2,
        criado_em: new Date().toISOString(),
      };
    } else {
      const { data: imobData } = await supabaseAdmin
        .from('imobiliarias')
        .select('*')
        .eq('id', captacao.imobiliaria_id)
        .single();

      if (!imobData) {
        imobiliaria = {
          id: captacao.imobiliaria_id,
          nome_fantasia: 'Imobiliária ImobIA',
          identificador_fiscal: 'CNPJ 12.345.678/0001-90',
          numero_registro: 'CRECI 45678-J',
          plano: 'profissional',
          config_pais: 'BR',
          delay_auto_reply_sec: 20,
          config_lembrete_1_horas: 24,
          config_lembrete_2_horas: 2,
          criado_em: new Date().toISOString(),
        };
      } else {
        imobiliaria = imobData;
      }
    }

    // 5. Buscar Corretor
    let corretor: Corretor | null = null;
    const corretorId = captacao.corretor_id || session?.corretor_id;
    if (corretorId) {
      try {
        corretor = await corretorRepo.findById(corretorId, imobiliaria.id);
      } catch {
        corretor = null;
      }
    }

    // 6. Montar dados da Autorização
    const dadosAutorizacao = montarDadosAutorizacao({
      captacao,
      imovel,
      imobiliaria,
      corretor,
      opcoes: {
        exclusividade,
        prazo_dias: prazoDias,
        comissao_pct: comissaoPct,
        proprietario_cpf: proprietarioCpf,
        matricula,
      },
    });

    if (format === 'json') {
      return NextResponse.json(dadosAutorizacao);
    }

    // 7. Gerar HTML Standalone
    const html = gerarHTMLAutorizacao(dadosAutorizacao);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('SERVER ERROR GET AUTORIZACAO CAPTACAO:', error);
    return new Response(
      `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Erro no Termo</title></head><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Erro ao gerar Termo de Autorização</h2><p>${error.message || 'Erro inesperado'}</p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
