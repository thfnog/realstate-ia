import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { waitUntil } from '@vercel/functions';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // We expect fields like: data_hora, local, titulo, descricao, status
    const { data: oldEvent, error: fetchError } = await supabaseAdmin
      .from('eventos')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !oldEvent) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    const { data: updatedEvent, error: updateError } = await supabaseAdmin
      .from('eventos')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Check if notification is needed (change in time, local or title)
    const hasCriticalChanges = 
      (body.data_hora && body.data_hora !== oldEvent.data_hora) ||
      (body.local && body.local !== oldEvent.local) ||
      (body.status === 'cancelado' && oldEvent.status !== 'cancelado');

    if (hasCriticalChanges) {
      waitUntil((async () => {
        try {
          const { data: fullDetails } = await supabaseAdmin
            .from('eventos')
            .select(`
              *,
              lead:leads(nome, telefone),
              corretor:corretores(nome, whatsapp_instance),
              imobiliaria:imobiliarias(config_pais)
            `)
            .eq('id', id)
            .single();

          if (fullDetails?.lead?.telefone && fullDetails?.corretor) {
            const { sendWhatsAppMessage } = await import('@/lib/whatsapp');
            const { format } = await import('date-fns');
            const { ptBR } = await import('date-fns/locale');

            const dateObj = new Date(updatedEvent.data_hora);
            const dateStr = format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
            const leadName = fullDetails.lead.nome.split(' ')[0];
            const countryCode = (fullDetails.imobiliaria as any)?.config_pais || 'BR';

            let message = '';
            if (updatedEvent.status === 'cancelado') {
              message = `*Agendamento Cancelado* ❌\n\nOlá ${leadName}, o compromisso "${oldEvent.titulo}" previsto para ${dateStr} foi cancelado. Em breve entraremos em contato para reagendar.`;
            } else {
              message = 
`*Agendamento Atualizado* 🔄

Olá ${leadName}, houve uma alteração no seu compromisso:

📍 *Novo Tipo:* ${updatedEvent.tipo === 'visita' ? '🏠 Visita' : '🤝 Reunião'}
⏰ *Nova Data/Hora:* ${dateStr}
🏢 *Local:* ${updatedEvent.local || 'A combinar'}
${updatedEvent.descricao ? `💡 *Obs:* ${updatedEvent.descricao}` : ''}

Nos vemos em breve!`;
            }

            await sendWhatsAppMessage(
              fullDetails.lead.telefone,
              message,
              fullDetails.corretor.whatsapp_instance || undefined,
              countryCode
            );
          }
        } catch (err) {
          console.error('⚠️ Falha ao notificar mudança de evento:', err);
        }
      })());
    }

    return NextResponse.json(updatedEvent);
  } catch (err) {
    console.error('[API Eventos PATCH Error]:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { error } = await supabaseAdmin.from('eventos').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
