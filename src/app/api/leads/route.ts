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
    let imobId = url.searchParams.get('imob_id');

    // v2.1: Robust UUID Fallback for Production
    if (!mock.isMockMode() && (!imobId || imobId === mock.DEFAULT_IMOBILIARIA_ID)) {
      const { data: firstImob } = await supabaseAdmin
        .from('imobiliarias')
        .select('id')
        .limit(1)
        .single();
      
      if (firstImob) {
        imobId = firstImob.id;
      }
    }

    const imobiliaria_id = imobId || mock.DEFAULT_IMOBILIARIA_ID;

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

    // De-duplication Logic: Check if lead already exists for this imobiliaria
    const { data: existingLead } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('imobiliaria_id', imobiliaria_id)
      .eq('telefone', body.telefone)
      .maybeSingle();

    if (existingLead && !['vendido', 'descartado', 'finalizado'].includes(existingLead.status)) {
      console.log(`♻️ Lead duplicado detectado (${body.telefone}). Atualizando lead ${existingLead.id} em vez de criar novo.`);
      
      // Merge logic for specific fields
      const newBairros = [...(existingLead.bairros_interesse || []), ...(body.bairros_interesse || [])];
      const uniqueBairros = Array.from(new Set(newBairros));

      const { data: updatedLead, error: updateError } = await supabaseAdmin
        .from('leads')
        .update({
          nome: body.nome || existingLead.nome,
          bairros_interesse: uniqueBairros,
          tipo_interesse: body.tipo_interesse || existingLead.tipo_interesse,
          orcamento: body.orcamento || existingLead.orcamento,
          prazo: body.prazo || existingLead.prazo,
          pagamento: body.pagamento || existingLead.pagamento,
          descricao_interesse: body.descricao_interesse 
            ? `${existingLead.descricao_interesse ? existingLead.descricao_interesse + '\n--- Novo Interesse ---\n' : ''}${body.descricao_interesse}`
            : existingLead.descricao_interesse,
        })
        .eq('id', existingLead.id)
        .select()
        .single();

      if (updateError) {
        console.error('Erro ao atualizar lead duplicado:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Add timeline event
      await supabaseAdmin.from('eventos').insert({
        imobiliaria_id,
        lead_id: existingLead.id,
        tipo: 'outro',
        titulo: `🔄 Novo contato via ${origem}`,
        descricao: `O lead manifestou novo interesse através do formulário/lead.`,
        data_hora: new Date().toISOString(),
        status: 'realizado'
      });

      // No need to re-run the full processLead if it's already in service, 
      // but maybe re-run it if requested. For now, let's just return success.
      return NextResponse.json({ success: true, leadId: existingLead.id, note: 'Lead atualizado' }, { status: 200 });
    }

    // Insert the lead (Original logic)
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
