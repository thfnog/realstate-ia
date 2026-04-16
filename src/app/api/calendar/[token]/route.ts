import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import type { EventoComDetalhes } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

function formatDateICS(dateStr: string, addHours = 0): string {
  const d = new Date(dateStr);
  d.setHours(d.getHours() + addHours);
  // ICS format requires: YYYYMMDDThhmmssZ (in UTC)
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export async function GET(request: Request, context: { params: { token: string } }) {
  try {
    // A token here often comes with .ics extension natively via URL
    const { token } = await context.params;
    const rawId = token.endsWith('.ics') ? token.replace('.ics', '') : token;

    if (!rawId) {
       return new NextResponse('Missing token', { status: 400 });
    }

    let eventosCorretor: EventoComDetalhes[] = [];
    let imobName = "ImobIA Sync";

    if (mock.isMockMode()) {
       // Check if this Corretor ID exists in mock array
       let corretores = mock.getCorretores();
       if (corretores.length === 0) {
         mock.seedTestData();
         corretores = mock.getCorretores();
       }
       
       const corretor = corretores.find(c => c.id === rawId);
       if (!corretor) return new NextResponse('Corretor inválido', { status: 404 });

       // Get Events where this 'Corretor' is scaled or directly assigned
       // Wait, Eventos can be directly assigned via corretor_id in 'Evento'
       // Or the Corretor bisa theoretically be retrieved via 'Escala' checking.
       // The simplest MVP calendar: Get all Events of the Broker's Imobiliaria that they are explicitly assigned to!
       const allEventos = mock.getEventos();
       eventosCorretor = allEventos.filter(e => e.corretor_id === rawId);

    } else {
       // Cloud db flow
       const { data: corretor, error: corErr } = await supabaseAdmin
        .from('corretores')
        .select('id, imobiliaria_id')
        .eq('id', rawId)
        .single();

       if (corErr || !corretor) return new NextResponse('Corretor inválido', { status: 404 });

       const { data: qEvents } = await supabaseAdmin
        .from('eventos')
        .select('*, lead:leads(*)')
        .eq('corretor_id', rawId)
        .order('data_hora', { ascending: true });

       if (qEvents) eventosCorretor = qEvents;
    }

    // Build the .ics text format natively
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ImobIA//Smart Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${imobName} - Assinaturas e Visitas
X-WR-TIMEZONE:UTC
`;

    for (const evt of eventosCorretor) {
      if (evt.status === 'cancelado') continue; // Don't sync cancelled events

      const startICS = formatDateICS(evt.data_hora);
      const endICS = formatDateICS(evt.data_hora, 1); // Mocking duration: 1 hour later
      
      const evtTitle = `[${evt.tipo.toUpperCase()}] ${evt.titulo} ${evt.lead ? `(Hospede: ${evt.lead.nome})` : ''}`;
      const evtDesc = evt.descricao || 'Conferir dashboard interno ImobIA';
      const loc = evt.local || 'Sem local';

      icsContent += `BEGIN:VEVENT
UID:${evt.id}@imobia-app.com
DTSTAMP:${startICS}
DTSTART:${startICS}
DTEND:${endICS}
SUMMARY:${evtTitle.replace(/\n}/g, ' ')}
DESCRIPTION:${evtDesc.replace(/\n}/g, ' ')}
LOCATION:${loc.replace(/\n}/g, ' ')}
STATUS:CONFIRMED
END:VEVENT
`;
    }

    icsContent += `END:VCALENDAR`;

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="agenda_imobia.ics"`,
      },
    });
  } catch (e) {
    return new NextResponse('Erro Interno de ICS', { status: 500 });
  }
}
