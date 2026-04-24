import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
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
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (mock.isMockMode()) {
    mock.seedTestData();
    const leads = mock.getLeads(status || undefined, session.corretor_id || undefined);
    const filtered = leads.filter(l => l.imobiliaria_id === session.imobiliaria_id);
    const from = (page - 1) * limit;
    const paginated = filtered.slice(from, from + limit);
    
    return NextResponse.json({
      data: paginated,
      count: filtered.length,
      page,
      limit
    });
  }

  // Use user-bound client for RLS
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value || '';
  const userSupabase = getUserSupabaseClient(token);

  let query = userSupabase
    .from('leads')
    .select('*, corretores(*)', { count: 'exact' });
  
  // Note: Manual filters (imobiliaria_id and role) are now handled by RLS in Supabase
  
  query = query.order('criado_em', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    count,
    page,
    limit
  });
}

import { z } from 'zod';
import { checkRateLimit } from '@/lib/rateLimit';

const leadSchema = z.object({
  nome: z.string().min(2, 'Nome muito curto'),
  telefone: z.string().min(8, 'Telefone inválido'),
  origem: z.enum(['formulario', 'email_ego', 'webhook_grupozap', 'whatsapp', 'manual']).optional(),
  portal_origem: z.string().optional(),
  moeda: z.enum(['BRL', 'EUR']).optional(),
  finalidade: z.enum(['comprar', 'alugar', 'investir']).optional(),
  prazo: z.string().optional(),
  pagamento: z.string().optional(),
  descricao_interesse: z.string().optional(),
  tipo_interesse: z.string().optional(),
  orcamento: z.number().optional(),
  area_interesse: z.number().optional(),
  quartos_interesse: z.number().optional(),
  vagas_interesse: z.number().optional(),
  bairros_interesse: z.array(z.string()).optional(),
});

// POST: Create a new lead (public) and trigger processing engine
export async function POST(request: Request) {
  try {
    // 1. Rate Limiting (Identifier: IP or X-Forwarded-For)
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Muitas solicitações. Tente novamente mais tarde.' }, { status: 429 });
    }

    const body = await request.json();
    
    // 2. Zod Validation
    const validation = leadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const data = validation.data;
    const config = getConfig();

    // v2: Default origem and moeda from country config
    const origem = data.origem || 'formulario';
    const moeda = data.moeda || (config.currency.code as 'EUR' | 'BRL');
    const portal_origem = data.portal_origem || null;
    
    // In V2 SaaS, public form should append ?imob_id in the URL.
    const url = new URL(request.url);
    let imobId = url.searchParams.get('imob_id');

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
        nome: data.nome,
        telefone: data.telefone,
        origem,
        portal_origem,
        moeda,
        finalidade: data.finalidade || null,
        prazo: data.prazo || null,
        pagamento: data.pagamento || null,
        descricao_interesse: data.descricao_interesse || null,
        tipo_interesse: data.tipo_interesse || null,
        orcamento: data.orcamento || null,
        area_interesse: data.area_interesse || null,
        quartos_interesse: data.quartos_interesse || null,
        vagas_interesse: data.vagas_interesse || null,
        bairros_interesse: data.bairros_interesse || null,
        corretor_id: null,
        status: 'novo',
      });

      processLeadMock(lead).catch((err) => console.error('Erro no processamento automático:', err));
      return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
    }

    // De-duplication Logic
    const { data: existingLead } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('imobiliaria_id', imobiliaria_id)
      .eq('telefone', data.telefone)
      .maybeSingle();

    if (existingLead && !['vendido', 'descartado', 'finalizado'].includes(existingLead.status)) {
      const newBairros = [...(existingLead.bairros_interesse || []), ...(data.bairros_interesse || [])];
      const uniqueBairros = Array.from(new Set(newBairros));

      const { data: updatedLead, error: updateError } = await supabaseAdmin
        .from('leads')
        .update({
          nome: data.nome || existingLead.nome,
          bairros_interesse: uniqueBairros,
          tipo_interesse: data.tipo_interesse || existingLead.tipo_interesse,
          orcamento: data.orcamento || existingLead.orcamento,
          prazo: data.prazo || existingLead.prazo,
          pagamento: data.pagamento || existingLead.pagamento,
          descricao_interesse: data.descricao_interesse 
            ? `${existingLead.descricao_interesse ? existingLead.descricao_interesse + '\n--- Novo Interesse ---\n' : ''}${data.descricao_interesse}`
            : existingLead.descricao_interesse,
        })
        .eq('id', existingLead.id)
        .select()
        .single();

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

      await supabaseAdmin.from('eventos').insert({
        imobiliaria_id,
        lead_id: existingLead.id,
        tipo: 'outro',
        titulo: `🔄 Novo contato via ${origem}`,
        descricao: `O lead manifestou novo interesse através do formulário/lead.`,
        data_hora: new Date().toISOString(),
        status: 'realizado'
      });

      return NextResponse.json({ success: true, leadId: existingLead.id, note: 'Lead atualizado' }, { status: 200 });
    }

    // Insert the lead
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .insert({
        imobiliaria_id,
        nome: data.nome,
        telefone: data.telefone,
        origem,
        portal_origem,
        moeda,
        finalidade: data.finalidade || null,
        prazo: data.prazo || null,
        pagamento: data.pagamento || null,
        descricao_interesse: data.descricao_interesse || null,
        tipo_interesse: data.tipo_interesse || null,
        orcamento: data.orcamento || null,
        area_interesse: data.area_interesse || null,
        quartos_interesse: data.quartos_interesse || null,
        vagas_interesse: data.vagas_interesse || null,
        bairros_interesse: data.bairros_interesse || null,
        status: 'novo',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    processLeadReal(lead as Lead).catch((err) => console.error('Erro no processamento automático:', err));

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
  } catch (err) {
    console.error('API Leads POST error:', err);
    return NextResponse.json({ error: 'Erro interno ao processar lead' }, { status: 500 });
  }
}
