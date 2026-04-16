import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import { getConfig } from '@/lib/countryConfig';
import type { LeadFormData, Lead } from '@/lib/database.types';
import { getAuthFromCookies } from '@/lib/auth';

// Mock-aware processing engine
async function processLeadMock(lead: Lead) {
  const { processLeadMockMode } = await import('@/lib/engine/processLeadMock');
  return processLeadMockMode(lead);
}

async function processLeadReal(lead: Lead) {
  const { processLead } = await import('@/lib/engine/processLead');
  return processLead(lead);
}

// GET: List all leads (admin)
export async function GET(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  if (mock.isMockMode()) {
    mock.seedTestData();
    const leads = mock.getLeads(status || undefined);
    return NextResponse.json(leads.filter(l => l.imobiliaria_id === session.imobiliaria_id));
  }

  let query = supabaseAdmin
    .from('leads')
    .select('*, corretores(*)')
    .eq('imobiliaria_id', session.imobiliaria_id)
    .order('criado_em', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: Create a new lead (public) and trigger processing engine
export async function POST(request: Request) {
  try {
    const body: LeadFormData = await request.json();
    const config = getConfig();

    // Validate required fields
    if (!body.nome || !body.telefone) {
      return NextResponse.json(
        { error: 'Nome e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    // v2: Default origem and moeda from country config
    const origem = body.origem || 'formulario';
    const moeda = body.moeda || (config.currency.code as 'EUR' | 'BRL');
    const portal_origem = body.portal_origem || null;
    
    // In V2 SaaS, public form should append ?imob_id in the URL.
    // We default to the original mock ID to retain current landing behavior.
    const url = new URL(request.url);
    const imobiliaria_id = url.searchParams.get('imob_id') || mock.DEFAULT_IMOBILIARIA_ID;

    if (mock.isMockMode()) {
      mock.seedTestData();
      const lead = mock.createLead({
        imobiliaria_id,
        nome: body.nome,
        telefone: body.telefone,
        origem,
        portal_origem,
        moeda,
        finalidade: body.finalidade || null,
        prazo: body.prazo || null,
        pagamento: body.pagamento || null,
        descricao_interesse: body.descricao_interesse || null,
        tipo_interesse: body.tipo_interesse || null,
        orcamento: body.orcamento || null,
        area_interesse: body.area_interesse || null,
        quartos_interesse: body.quartos_interesse || null,
        vagas_interesse: body.vagas_interesse || null,
        bairros_interesse: body.bairros_interesse || null,
        corretor_id: null,
        status: 'novo',
      });

      // Trigger processing
      processLeadMock(lead).catch((err) => {
        console.error('Erro no processamento automático:', err);
      });

      return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
    }

    // Insert the lead
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .insert({
        imobiliaria_id,
        nome: body.nome,
        telefone: body.telefone,
        origem,
        portal_origem,
        moeda,
        finalidade: body.finalidade || null,
        prazo: body.prazo || null,
        pagamento: body.pagamento || null,
        descricao_interesse: body.descricao_interesse || null,
        tipo_interesse: body.tipo_interesse || null,
        orcamento: body.orcamento || null,
        area_interesse: body.area_interesse || null,
        quartos_interesse: body.quartos_interesse || null,
        vagas_interesse: body.vagas_interesse || null,
        bairros_interesse: body.bairros_interesse || null,
        status: 'novo',
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir lead:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trigger processing engine (async, don't wait)
    processLeadReal(lead as Lead).catch((err) => {
      console.error('Erro no processamento automático:', err);
    });

    return NextResponse.json(
      { success: true, leadId: lead.id },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Erro interno ao processar lead' },
      { status: 500 }
    );
  }
}
