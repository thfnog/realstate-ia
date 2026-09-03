import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isMockMode } from '@/lib/mockDb';

export const dynamic = 'force-dynamic';

export function formatGoogleCalendarDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function generateGoogleCalendarUrl(options: {
  title: string;
  start: Date;
  end?: Date;
  details?: string;
  location?: string;
}): string {
  const startStr = formatGoogleCalendarDate(options.start);
  const endDate = options.end || new Date(options.start.getTime() + 60 * 60 * 1000);
  const endStr = formatGoogleCalendarDate(endDate);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: options.title,
    dates: `${startStr}/${endStr}`,
  });

  if (options.details) params.set('details', options.details);
  if (options.location) params.set('location', options.location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventoId = searchParams.get('evento_id');
    const redirect = searchParams.get('redirect') === 'true';

    // If direct parameters are provided
    const titleParam = searchParams.get('title');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const detailsParam = searchParams.get('details');
    const locationParam = searchParams.get('location');

    if (titleParam && startParam) {
      const gcalUrl = generateGoogleCalendarUrl({
        title: titleParam,
        start: new Date(startParam),
        end: endParam ? new Date(endParam) : undefined,
        details: detailsParam || undefined,
        location: locationParam || undefined
      });

      if (redirect) {
        return NextResponse.redirect(gcalUrl);
      }
      return NextResponse.json({ url: gcalUrl });
    }

    if (!eventoId) {
      return NextResponse.json({ error: 'evento_id ou parâmetros title/start são obrigatórios' }, { status: 400 });
    }

    let evento: any = null;

    if (isMockMode()) {
      const mockDb = await import('@/lib/mockDb');
      mockDb.seedTestData();
      const events = mockDb.getEventos();
      evento = events.find(e => e.id === eventoId);
    } else {
      const { data } = await supabaseAdmin
        .from('eventos')
        .select('*, lead:leads(*, imoveis(*)), corretor:corretores(*)')
        .eq('id', eventoId)
        .single();
      evento = data;
    }

    if (!evento) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    const start = new Date(evento.data_hora);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const tipoUpper = (evento.tipo || 'evento').toUpperCase();
    const leadNome = evento.lead?.nome || '';
    const title = `${tipoUpper}: ${evento.titulo}${leadNome ? ` - ${leadNome}` : ''}`;

    const detailsParts: string[] = [];
    if (evento.descricao) detailsParts.push(`Notas: ${evento.descricao}`);
    if (evento.lead) {
      detailsParts.push(`Lead: ${evento.lead.nome}`);
      if (evento.lead.telefone) detailsParts.push(`WhatsApp: ${evento.lead.telefone}`);
    }
    if (evento.corretor) {
      detailsParts.push(`Corretor: ${evento.corretor.nome} (${evento.corretor.telefone})`);
    }
    if (evento.local) {
      detailsParts.push(`Waze: https://waze.com/ul?q=${encodeURIComponent(evento.local)}&navigate=yes`);
      detailsParts.push(`Google Maps: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evento.local)}`);
    }

    const gcalUrl = generateGoogleCalendarUrl({
      title,
      start,
      end,
      details: detailsParts.join('\n'),
      location: evento.local || ''
    });

    if (redirect) {
      return NextResponse.redirect(gcalUrl);
    }

    return NextResponse.json({
      url: gcalUrl,
      evento: {
        id: evento.id,
        titulo: evento.titulo,
        tipo: evento.tipo,
        data_hora: evento.data_hora,
        local: evento.local
      }
    });

  } catch (err: any) {
    console.error('[Google Calendar Link Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
