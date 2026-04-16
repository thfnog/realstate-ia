import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import { getAuthFromCookies } from '@/lib/auth';

// GET: List all events (optionally filtered by leadId, start, end)
export async function GET(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('lead_id');
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (mock.isMockMode()) {
    mock.seedTestData();
    const eventos = mock.getEventos(leadId || undefined, start || undefined, end || undefined);
    return NextResponse.json(eventos.filter(e => e.imobiliaria_id === session.imobiliaria_id));
  }

  let query = supabaseAdmin
    .from('eventos')
    .select('*, lead:leads(*), corretor:corretores(*)')
    .eq('imobiliaria_id', session.imobiliaria_id)
    .order('data_hora', { ascending: true });

  if (leadId) query = query.eq('lead_id', leadId);
  if (start) query = query.gte('data_hora', start);
  if (end) query = query.lte('data_hora', end);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: Create a new event
export async function POST(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await request.json();

    if (mock.isMockMode()) {
      const evento = mock.createEvento({
        imobiliaria_id: session.imobiliaria_id,
        lead_id: body.lead_id,
        corretor_id: body.corretor_id || null,
        tipo: body.tipo,
        titulo: body.titulo,
        descricao: body.descricao || null,
        data_hora: body.data_hora,
        local: body.local || null,
        status: body.status || 'agendado',
      });
      
      // Auto-update lead status to 'visita_agendada' if event is 'visita'
      if (evento.tipo === 'visita') {
        const lead = mock.getLeadById(evento.lead_id);
        if (lead && (lead.status === 'novo' || lead.status === 'em_atendimento')) {
           mock.updateLead(lead.id, { status: 'visita_agendada' });
        }
      }

      return NextResponse.json(evento, { status: 201 });
    }

    const { data: evento, error } = await supabaseAdmin
      .from('eventos')
      .insert({
        imobiliaria_id: session.imobiliaria_id,
        lead_id: body.lead_id,
        corretor_id: body.corretor_id || null,
        tipo: body.tipo,
        titulo: body.titulo,
        descricao: body.descricao || null,
        data_hora: body.data_hora,
        local: body.local || null,
        status: body.status || 'agendado',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (evento.tipo === 'visita') {
      const { data: lead } = await supabaseAdmin.from('leads').select('status').eq('id', evento.lead_id).single();
      if (lead && (lead.status === 'novo' || lead.status === 'em_atendimento')) {
        await supabaseAdmin.from('leads').update({ status: 'visita_agendada' }).eq('id', evento.lead_id);
      }
    }

    return NextResponse.json(evento, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
