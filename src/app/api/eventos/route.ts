import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import type { Evento, EventoComDetalhes } from '@/lib/database.types';

export async function GET() {
  try {
    if (mock.isMockMode()) {
       mock.seedTestData();
       const events = mock.getEventos();
       return NextResponse.json(events);
    }

    const { data, error } = await supabaseAdmin
      .from('eventos')
      .select('*, lead:leads(*), corretor:corretores(*)')
      .order('data_hora', { ascending: true });

    if (error) {
       return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[API Eventos GET Error]:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imobiliaria_id, lead_id, corretor_id, tipo, titulo, data_hora, local, descricao } = body;

    if (!imobiliaria_id || !lead_id || !data_hora || !titulo) {
       return NextResponse.json({ error: 'Faltando campos obrigatórios' }, { status: 400 });
    }

    const eventData: Omit<Evento, 'id' | 'criado_em'> = {
      imobiliaria_id,
      lead_id,
      corretor_id: corretor_id || null,
      tipo: tipo || 'outro',
      titulo,
      data_hora,
      local: local || null,
      descricao: descricao || null,
      status: 'agendado',
    };

    if (mock.isMockMode()) {
       const newEvent = mock.createEvento(eventData);
       return NextResponse.json(newEvent, { status: 201 });
    }

    const { data, error } = await supabaseAdmin
      .from('eventos')
      .insert(eventData)
      .select()
      .single();

    if (error) {
       return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
