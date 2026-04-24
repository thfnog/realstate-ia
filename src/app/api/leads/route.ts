import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserSupabaseClient } from '@/lib/supabase';
import { waitUntil } from '@vercel/functions';
import { cookies } from 'next/headers';
import { getLeadRepository } from '@/lib/repositories/factory';
import { getConfig } from '@/lib/countryConfig';
import { isMockMode, DEFAULT_IMOBILIARIA_ID, getLeads } from '@/lib/mockDb';
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

  // Initialize Repository
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value || '';
  const client = getUserSupabaseClient(token);
  const repository = getLeadRepository(client);

  // Fetch leads using the repository (handles both Mock and Supabase/RLS)
  const { data, count } = await repository.findAll({
    imobiliaria_id: session.imobiliaria_id,
    status: status || undefined,
    corretor_id: session.app_role === 'corretor' ? (session.corretor_id || undefined) : undefined,
    page,
    limit
  });

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

    if (!isMockMode() && (!imobId || imobId === DEFAULT_IMOBILIARIA_ID)) {
      const { data: firstImob } = await supabaseAdmin
        .from('imobiliarias')
        .select('id')
        .limit(1)
        .single();
      
      if (firstImob) {
        imobId = firstImob.id;
      }
    }

    const imobiliaria_id = imobId || DEFAULT_IMOBILIARIA_ID;
    const repository = getLeadRepository(supabaseAdmin);

    // De-duplication Logic
    let existingLead: Lead | null = null;
    
    if (isMockMode()) {
       existingLead = (getLeads().find(l => l.imobiliaria_id === imobiliaria_id && l.telefone === data.telefone) as any) || null;
    } else {
       const { data: res } = await supabaseAdmin
         .from('leads')
         .select('*')
         .eq('imobiliaria_id', imobiliaria_id)
         .eq('telefone', data.telefone)
         .maybeSingle();
       existingLead = res as any;
    }

    if (existingLead && !['vendido', 'descartado', 'finalizado'].includes(existingLead.status)) {
      const newBairros = [...(existingLead.bairros_interesse || []), ...(data.bairros_interesse || [])];
      const uniqueBairros = Array.from(new Set(newBairros));

      await repository.update(existingLead.id, imobiliaria_id, {
        nome: data.nome || existingLead.nome,
        bairros_interesse: uniqueBairros,
        tipo_interesse: data.tipo_interesse || existingLead.tipo_interesse,
        orcamento: data.orcamento || existingLead.orcamento,
        prazo: data.prazo || existingLead.prazo,
        pagamento: data.pagamento || existingLead.pagamento,
        descricao_interesse: data.descricao_interesse 
          ? `${existingLead.descricao_interesse ? existingLead.descricao_interesse + '\n--- Novo Interesse ---\n' : ''}${data.descricao_interesse}`
          : existingLead.descricao_interesse,
      });

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

    // Insert the lead using repository
    const lead = await repository.create({
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
    });

    if (isMockMode()) {
      processLeadMock(lead as Lead).catch((err) => console.error('Erro no processamento automático (mock):', err));
    } else {
      waitUntil(processLeadReal(lead as Lead));
    }

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
  } catch (err) {
    console.error('API Leads POST error:', err);
    return NextResponse.json({ error: 'Erro interno ao processar lead' }, { status: 500 });
  }
}
