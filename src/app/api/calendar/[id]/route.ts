import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SupabaseEventoRepository } from '@/lib/repositories/SupabaseEventoRepository';
import { MockEventoRepository } from '@/lib/repositories/MockEventoRepository';
import { isMockMode } from '@/lib/mockDb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let { id: corretorId } = await params;
    corretorId = corretorId.replace('.ics', '');

    // We use supabaseAdmin here because calendar sync is a public URL (authenticated by ID/Token)
    // and needs to bypass standard user-session RLS.
    // In a production environment, we should use a separate "sync_token" instead of the ID.
    const repository = isMockMode() 
      ? new MockEventoRepository() 
      : new SupabaseEventoRepository(supabaseAdmin);

    // Fetch broker to get imobiliaria_id and name
    const { data: corretor } = isMockMode()
      ? { data: (await import('@/lib/mockDb')).getCorretorById(corretorId) }
      : await supabaseAdmin.from('corretores').select('*, imobiliarias(nome_fantasia)').eq('id', corretorId).single();

    if (!corretor) {
      return new Response('Corretor não encontrado', { status: 404 });
    }

    const imobId = corretor.imobiliaria_id;
    const imobNome = (corretor as any).imobiliarias?.nome_fantasia || 'ImobIA';

    const events = await repository.findAll({
      imobiliaria_id: imobId,
      corretor_id: corretorId
    });

    // Fetch Duty Days (Escala)
    const { data: escala } = isMockMode()
      ? { data: (await import('@/lib/mockDb')).getEscala().filter(e => e.corretor_id === corretorId) }
      : await supabaseAdmin.from('escala').select('*').eq('corretor_id', corretorId);

    // Generate ICS content
    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//ImobIA//${imobNome}//PT`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:ImobIA - ${corretor.nome}`,
      'X-WR-TIMEZONE:UTC',
    ];

    const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    // Add Events
    events.forEach(event => {
      const start = new Date(event.data_hora);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1h default
      
      const summary = `${event.tipo.toUpperCase()}: ${event.titulo}${event.lead ? ` - ${event.lead.nome}` : ''}`;
      const descParts = [
        event.descricao ? `Notas: ${event.descricao}` : '',
        event.lead ? `Lead: ${event.lead.nome} (${event.lead.telefone})` : '',
        event.lead?.imoveis ? `Imóvel: ${event.lead.imoveis.referencia} - ${event.lead.imoveis.titulo}` : '',
        event.local ? `Waze: https://waze.com/ul?q=${encodeURIComponent(event.local)}&navigate=yes` : '',
        event.local ? `Google Maps: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.local)}` : ''
      ].filter(Boolean);

      let icsStatus = 'CONFIRMED';
      if (event.status === 'cancelado') icsStatus = 'CANCELLED';
      else if (event.status === 'agendado' || event.status === 'reagendamento_solicitado') icsStatus = 'TENTATIVE';

      ics.push('BEGIN:VEVENT');
      ics.push(`UID:evt-${event.id}@imobia.com`);
      ics.push(`DTSTAMP:${formatDate(new Date())}`);
      ics.push(`DTSTART:${formatDate(start)}`);
      ics.push(`DTEND:${formatDate(end)}`);
      ics.push(`SUMMARY:${summary}`);
      ics.push(`DESCRIPTION:${descParts.join('\\n')}`);
      ics.push(`STATUS:${icsStatus}`);
      if (event.local) ics.push(`LOCATION:${event.local}`);
      if (event.lead?.imoveis?.latitude && event.lead?.imoveis?.longitude) {
        ics.push(`GEO:${event.lead.imoveis.latitude};${event.lead.imoveis.longitude}`);
      }
      ics.push('END:VEVENT');
    });

    // Add Duty Days (Escala)
    (escala || []).forEach((esc: any) => {
      const dateICS = esc.data.replace(/-/g, ''); // YYYYMMDD
      
      ics.push('BEGIN:VEVENT');
      ics.push(`UID:${esc.id}@imobia.com`);
      ics.push(`DTSTAMP:${dateICS}T000000Z`);
      ics.push(`DTSTART;VALUE=DATE:${dateICS}`);
      ics.push('SUMMARY:🚩 PLANTÃO ImobIA');
      ics.push('DESCRIPTION:Você está escalado para o plantão neste dia.');
      ics.push('STATUS:CONFIRMED');
      ics.push('TRANSP:TRANSPARENT');
      ics.push('END:VEVENT');
    });

    ics.push('END:VCALENDAR');

    return new Response(ics.join('\r\n'), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="agenda-${corretor.nome.toLowerCase().replace(/\s+/g, '-')}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[CALENDAR ERROR]:', err);
    return new Response('Erro ao gerar calendário', { status: 500 });
  }
}
