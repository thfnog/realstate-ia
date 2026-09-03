import { NextResponse } from 'next/server';
import { getAuthFromCookies } from '@/lib/auth';
import { 
  findReactivationOpportunities, 
  generateReactivationMessage 
} from '@/lib/engine/leadReactivationEngine';
import { supabaseAdmin } from '@/lib/supabase';
import { isMockMode } from '@/lib/mockDb';
import * as mockDb from '@/lib/mockDb';
import type { CountryCode } from '@/lib/countryConfig';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const diasInativo = parseInt(searchParams.get('dias_inativo') || '15');
    const corretorIdParam = searchParams.get('corretor_id');
    const limitParam = parseInt(searchParams.get('limit') || '30');

    const corretorId = session.app_role === 'corretor' 
      ? session.corretor_id || undefined 
      : (corretorIdParam || undefined);

    let config_pais: CountryCode = 'BR';
    if (isMockMode()) {
      const imob = mockDb.getImobiliariaById(session.imobiliaria_id);
      config_pais = (imob?.config_pais as CountryCode) || 'BR';
    } else {
      const { data: imobData } = await supabaseAdmin
        .from('imobiliarias')
        .select('config_pais')
        .eq('id', session.imobiliaria_id)
        .single();
      if (imobData) config_pais = (imobData.config_pais as CountryCode) || 'BR';
    }

    const opportunities = await findReactivationOpportunities({
      imobiliaria_id: session.imobiliaria_id,
      diasSemContato: diasInativo,
      corretor_id: corretorId,
      config_pais,
      limit: limitParam
    });

    return NextResponse.json({
      opportunities,
      total: opportunities.length,
      dias_filtro: diasInativo
    });

  } catch (err: any) {
    console.error('[API CRM Reativação Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { lead_id, imovel_id, custom_instructions } = body;

    if (!lead_id) {
      return NextResponse.json({ error: 'lead_id é obrigatório' }, { status: 400 });
    }

    let lead: any = null;
    let imovel: any = null;
    let corretor: any = null;
    let config_pais: CountryCode = 'BR';

    if (isMockMode()) {
      mockDb.seedTestData();
      lead = mockDb.getLeadById(lead_id);
      if (imovel_id) imovel = mockDb.getImovelById(imovel_id);
      if (lead?.corretor_id) corretor = mockDb.getCorretorById(lead.corretor_id);
      const imob = mockDb.getImobiliariaById(session.imobiliaria_id);
      config_pais = (imob?.config_pais as CountryCode) || 'BR';
    } else {
      const { data: lData } = await supabaseAdmin.from('leads').select('*, corretores(*)').eq('id', lead_id).single();
      lead = lData;
      if (lead?.corretores) corretor = lead.corretores;
      if (imovel_id) {
        const { data: iData } = await supabaseAdmin.from('imoveis').select('*').eq('id', imovel_id).single();
        imovel = iData;
      }
      const { data: imobData } = await supabaseAdmin.from('imobiliarias').select('config_pais').eq('id', session.imobiliaria_id).single();
      if (imobData) config_pais = (imobData.config_pais as CountryCode) || 'BR';
    }

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    const message = await generateReactivationMessage({
      lead,
      imovel,
      corretor,
      config_pais,
      customContext: custom_instructions
    });

    return NextResponse.json({
      lead_id,
      mensagem: message,
      imovel_sugerido: imovel || null
    });

  } catch (err: any) {
    console.error('[API CRM Reativação POST Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
