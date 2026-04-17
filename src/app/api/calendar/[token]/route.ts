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

function formatDateOnlyICS(dateStr: string): string {
  // Returns YYYYMMDD for all-day events
  return dateStr.replace(/-/g, '');
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
    let escalaCorretor: any[] = [];
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

       // Get Events where this 'Corretor' is explicitly assigned
       const allEventos = mock.getEventos();
       eventosCorretor = allEventos.filter(e => e.corretor_id === rawId);

       // Get Escala (Duty days)
       const allEscala = mock.getEscala();
       escalaCorretor = allEscala.filter(e => e.corretor_id === rawId);

    } else {
       // Cloud db flow
       const { data: corretor, error: corErr } = await supabaseAdmin
        .from('corretores')
        .select('id, imobiliaria_id')
        .eq('id', rawId)
        .single();

       if (corErr || !corretor) return new NextResponse('Corretor inválido', { status: 404 });

       // Fetch Events and Escala in parallel
       const [qEvents, qEscala] = await Promise.all([
         supabaseAdmin.from('eventos').select('*, lead:leads(*)').eq('corretor_id', rawId).order('data_hora', { ascending: true }),
         supabaseAdmin.from('escala').select('*').eq('corretor_id', rawId).order('data', { ascending: true })
       ]);

       if (qEvents.data) eventosCorretor = qEvents.data;
       if (qEscala.data) escalaCorretor = qEscala.data;
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

    // 1. Add Scheduled Events (Visits, Meetings, etc)
    for (const evt of eventosCorretor) {
      if (evt.status === 'cancelado') continue; 

      const startICS = formatDateICS(evt.data_hora);
      const endICS = formatDateICS(evt.data_hora, 1); 
      
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

    // 2. Add Duty Days (Escala) as All-Day Events
    for (const esc of escalaCorretor) {
      const dateICS = formatDateOnlyICS(esc.data);
      
      icsContent += `BEGIN:VEVENT
UID:${esc.id}@imobia-app.com
DTSTAMP:${dateICS}T000000Z
DTSTART;VALUE=DATE:${dateICS}
SUMMARY:🚩 PLANTÃO ImobIA
DESCRIPTION:Você está escalado para o plantão neste dia.
STATUS:CONFIRMED
TRANSP:TRANSPARENT
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
