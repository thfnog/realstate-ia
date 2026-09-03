import { NextResponse } from 'next/server';
import { getUserSupabaseClient, supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getAuthFromCookies } from '@/lib/auth';
import { getImovelRepository, getCorretorRepository } from '@/lib/repositories/factory';
import { isMockMode, getImobiliariaById, DEFAULT_IMOBILIARIA_ID } from '@/lib/mockDb';
import { gerarLaudoCMACompleto, gerarLaudoCMAStats, gerarParecerConsultivoIA } from '@/lib/imoveis/cmaEngine';
import { Imobiliaria, Corretor } from '@/lib/database.types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const step = searchParams.get('step');
    const isFast = searchParams.get('fast') === '1' || searchParams.get('fast') === 'true' || step === 'stats';
    const isParecerOnly = searchParams.get('parecerOnly') === '1' || searchParams.get('parecerOnly') === 'true' || step === 'parecer';

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    
    const imovelRepo = getImovelRepository(client);
    const corretorRepo = getCorretorRepository(client);

    // 1. Buscar o imóvel alvo
    const imovel = await imovelRepo.findById(id, session.imobiliaria_id);
    if (!imovel) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    // 2. Buscar todos os imóveis da base para amostragem comparativa
    const { data: todosImoveis } = await imovelRepo.findAll({
      imobiliaria_id: session.imobiliaria_id,
      limit: 100,
    });

    // 3. Buscar dados da Imobiliária (Tenant)
    let imobiliaria: Imobiliaria;
    if (isMockMode()) {
      imobiliaria = getImobiliariaById(session.imobiliaria_id) || getImobiliariaById(DEFAULT_IMOBILIARIA_ID) || {
        id: session.imobiliaria_id,
        nome_fantasia: 'Imobiliária ImobIA',
        identificador_fiscal: imovel.pais === 'PT' ? 'NIF 500 123 456' : 'CNPJ 12.345.678/0001-90',
        numero_registro: imovel.pais === 'PT' ? 'AMI 12345' : 'CRECI 45678-J',
        plano: 'profissional',
        config_pais: imovel.pais || 'BR',
        delay_auto_reply_sec: 20,
        config_lembrete_1_horas: 24,
        config_lembrete_2_horas: 2,
        criado_em: new Date().toISOString(),
      };
    } else {
      const { data: imobData, error: imobError } = await supabaseAdmin
        .from('imobiliarias')
        .select('*')
        .eq('id', session.imobiliaria_id)
        .single();

      if (imobError || !imobData) {
        imobiliaria = {
          id: session.imobiliaria_id,
          nome_fantasia: 'Imobiliária ImobIA',
          identificador_fiscal: imovel.pais === 'PT' ? 'NIF 500 123 456' : 'CNPJ 12.345.678/0001-90',
          numero_registro: imovel.pais === 'PT' ? 'AMI 12345' : 'CRECI 45678-J',
          plano: 'profissional',
          config_pais: imovel.pais || 'BR',
          delay_auto_reply_sec: 20,
          config_lembrete_1_horas: 24,
          config_lembrete_2_horas: 2,
          criado_em: new Date().toISOString(),
        };
      } else {
        imobiliaria = imobData;
      }
    }

    // 4. Buscar corretor responsável
    let corretor: Corretor | null = null;
    const corretorId = imovel.corretor_id || session.corretor_id;
    if (corretorId) {
      try {
        corretor = await corretorRepo.findById(corretorId, session.imobiliaria_id);
      } catch {
        corretor = null;
      }
    }

    // 5. Caso seja apenas o parecer de IA (segunda etapa do carregamento progressivo)
    if (isParecerOnly) {
      const laudoStats = gerarLaudoCMAStats({
        imovel,
        todosImoveis: todosImoveis || [],
        imobiliaria,
        corretor,
      });

      const parecerIA = await gerarParecerConsultivoIA(
        imovel,
        laudoStats.estatisticas,
        laudoStats.comparaveis,
        laudoStats.faixasPreco,
        imobiliaria,
        corretor
      );

      return NextResponse.json({ parecerIA });
    }

    // 6. Carregamento rápido (estatísticas puras em ~2ms)
    if (isFast) {
      const laudoStats = gerarLaudoCMAStats({
        imovel,
        todosImoveis: todosImoveis || [],
        imobiliaria,
        corretor,
      });

      return NextResponse.json(laudoStats);
    }

    // 7. Geração completa síncrona tradicional
    const laudo = await gerarLaudoCMACompleto({
      imovel,
      todosImoveis: todosImoveis || [],
      imobiliaria,
      corretor,
    });

    return NextResponse.json(laudo);
  } catch (error: any) {
    console.error('SERVER ERROR GET LAUDO AVALIACAO:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar laudo de avaliação' },
      { status: 500 }
    );
  }
}
