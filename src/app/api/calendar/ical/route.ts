import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SupabaseEventoRepository } from '@/lib/repositories/SupabaseEventoRepository';
import { MockEventoRepository } from '@/lib/repositories/MockEventoRepository';
import { isMockMode } from '@/lib/mockDb';

export const dynamic = 'force-dynamic';

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICS(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let corretorId = searchParams.get('corretor_id') || searchParams.get('id');
    const token = searchParams.get('token');
    const imobiliariaId = searchParams.get('imobiliaria_id');

    if (corretorId) {
      corretorId = corretorId.replace('.ics', '');
    }

    const repository = isMockMode()
      ? new MockEventoRepository()
      : new SupabaseEventoRepository(supabaseAdmin);

    let broker: any = null;
    let imobNome = 'ImobIA';
    let targetImobId = imobiliariaId;

    if (isMockMode()) {
      const mockDb = await import('@/lib/mockDb');
      mockDb.seedTestData();
      if (corretorId && corretorId !== 'all') {
        broker = mockDb.getCorretorById(corretorId);
      } else {
        const brokers = mockDb.getCorretores();
        broker = brokers[0] || null;
      }
      targetImobId = broker?.imobiliaria_id || mockDb.DEFAULT_IMOBILIARIA_ID;
      const imob = targetImobId ? mockDb.getImobiliariaById(targetImobId) : null;
      imobNome = imob?.nome_fantasia || 'ImobIA';
    } else {
      if (corretorId && corretorId !== 'all') {
        const { data: cData } = await supabaseAdmin
          .from('corretores')
          .select('*, imobiliarias(nome_fantasia)')
          .eq('id', corretorId)
          .maybeSingle();
        broker = cData;
        if (broker) {
          targetImobId = broker.imobiliaria_id;
          imobNome = (broker as any).imobiliarias?.nome_fantasia || 'ImobIA';
        }
      } else if (targetImobId) {
        const { data: imobData } = await supabaseAdmin
          .from('imobiliarias')
          .select('nome_fantasia')
          .eq('id', targetImobId)
          .single();
        if (imobData) imobNome = imobData.nome_fantasia;
      }
    }

    if (!targetImobId && !broker) {
      return new Response('Corretor ou Imobiliária não identificada', { status: 400 });
    }

    // Fetch Events
    const events = await repository.findAll({
      imobiliaria_id: targetImobId || broker.imobiliaria_id,
      corretor_id: broker?.id && corretorId !== 'all' ? broker.id : undefined
    });

    // Fetch Duty Schedule (Escala)
    let escala: any[] = [];
    if (isMockMode()) {
      const mockDb = await import('@/lib/mockDb');
      escala = mockDb.getEscala().filter(e => !broker || e.corretor_id === broker.id);
    } else if (broker?.id) {
      const { data: escData } = await supabaseAdmin
        .from('escala')
        .select('*')
        .eq('corretor_id', broker.id);
      escala = escData || [];
    }

    // Build iCal Stream
    const calName = broker ? `ImobIA - ${broker.nome}` : `ImobIA - ${imobNome}`;
    const icsLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//ImobIA//${escapeICS(imobNome)}//PT-BR`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeICS(calName)}`,
      'X-WR-TIMEZONE:UTC',
      'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
      'X-PUBLISHED-TTL:PT15M',
    ];

    const nowFormatted = formatICSDate(new Date());

    // 1. Add Events
    for (const event of events) {
      const start = new Date(event.data_hora);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1h duration

      const tipoUpper = (event.tipo || 'evento').toUpperCase();
      const leadNome = event.lead?.nome || '';
      const summary = `${tipoUpper}: ${event.titulo}${leadNome ? ` - ${leadNome}` : ''}`;

      const descParts: string[] = [];
      if (event.descricao) descParts.push(`Notas: ${event.descricao}`);
      if (event.lead) {
        descParts.push(`Lead: ${event.lead.nome}`);
        if (event.lead.telefone) descParts.push(`WhatsApp: ${event.lead.telefone}`);
        if (event.lead.email) descParts.push(`Email: ${event.lead.email}`);
      }
      const linkedImovel = (event as any).imovel || event.lead?.imoveis;
      if (linkedImovel) {
        descParts.push(`Imóvel: ${linkedImovel.referencia || ''} - ${linkedImovel.titulo || ''}`);
        if (linkedImovel.valor) descParts.push(`Valor: R$ ${linkedImovel.valor.toLocaleString('pt-BR')}`);
      }
      if (event.local) {
        descParts.push(`Endereço: ${event.local}`);
        descParts.push(`Waze: https://waze.com/ul?q=${encodeURIComponent(event.local)}&navigate=yes`);
        descParts.push(`Google Maps: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.local)}`);
      }

      let icsStatus = 'CONFIRMED';
      if (event.status === 'cancelado') icsStatus = 'CANCELLED';
      else if (event.status === 'agendado' || event.status === 'reagendamento_solicitado') icsStatus = 'TENTATIVE';

      icsLines.push('BEGIN:VEVENT');
      icsLines.push(`UID:evt-${event.id}@imobia.com`);
      icsLines.push(`DTSTAMP:${nowFormatted}`);
      icsLines.push(`DTSTART:${formatICSDate(start)}`);
      icsLines.push(`DTEND:${formatICSDate(end)}`);
      icsLines.push(`SUMMARY:${escapeICS(summary)}`);
      icsLines.push(`DESCRIPTION:${escapeICS(descParts.join('\n'))}`);
      icsLines.push(`STATUS:${icsStatus}`);

      if (event.local) {
        icsLines.push(`LOCATION:${escapeICS(event.local)}`);
      }

      const lat = linkedImovel?.latitude;
      const lng = linkedImovel?.longitude;
      if (lat && lng) {
        icsLines.push(`GEO:${lat};${lng}`);
      }

      icsLines.push('END:VEVENT');
    }

    // 2. Add Escala (Duty days)
    for (const esc of escala) {
      const dateICS = esc.data.replace(/-/g, '');
      icsLines.push('BEGIN:VEVENT');
      icsLines.push(`UID:esc-${esc.id}@imobia.com`);
      icsLines.push(`DTSTAMP:${nowFormatted}`);
      icsLines.push(`DTSTART;VALUE=DATE:${dateICS}`);
      icsLines.push(`SUMMARY:🚩 PLANTÃO ImobIA`);
      icsLines.push(`DESCRIPTION:Você está escalado para o plantão imobiliário.`);
      icsLines.push('STATUS:CONFIRMED');
      icsLines.push('TRANSP:TRANSPARENT');
      icsLines.push('END:VEVENT');
    }

    icsLines.push('END:VCALENDAR');

    const fileName = broker
      ? `agenda-${broker.nome.toLowerCase().replace(/[^a-z0-9]/g, '-')}.ics`
      : 'agenda.ics';

    return new Response(icsLines.join('\r\n'), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[iCal Feed Error]:', err);
    return new Response('Erro ao gerar feed iCal', { status: 500 });
  }
}
