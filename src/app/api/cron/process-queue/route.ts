import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchInstanceStatus } from '@/lib/whatsapp';

export const maxDuration = 60; // Permite rodar até 60s
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 1. Fetch pending messages (limit 20 per minute to avoid rate limits)
    const { data: messages, error } = await supabaseAdmin
      .from('mensagens_pendentes')
      .select('*')
      .eq('status', 'pendente')
      .lt('tentativas', 5)
      .order('criado_em', { ascending: true })
      .limit(20);

    if (error) throw error;
    if (!messages || messages.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'Fila vazia' });
    }

    let processed = 0;
    let sent = 0;

    for (const msg of messages) {
      processed++;
      const { id, instance_name, telefone_destino, mensagem, tentativas } = msg;

      // 2. Check if instance is connected before trying to send
      const status = await fetchInstanceStatus(instance_name);
      
      if (status !== 'open') {
        // Increment retry, but keep pending. Let Health check handle the warning.
        await supabaseAdmin
          .from('mensagens_pendentes')
          .update({ 
            tentativas: tentativas + 1, 
            erro_log: 'Instância offline ou desconectada.',
            atualizado_em: new Date().toISOString()
          })
          .eq('id', id);
        continue;
      }

      // 3. Try to send via Evolution API
      const EVOLUTION_URL = process.env.EVOLUTION_URL?.replace(/\/$/, '');
      const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

      if (!EVOLUTION_URL || !EVOLUTION_API_KEY) continue;

      try {
        const res = await fetch(`${EVOLUTION_URL}/message/sendText/${instance_name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY
          },
          body: JSON.stringify({
            number: telefone_destino.includes('@') ? telefone_destino : `${telefone_destino}@s.whatsapp.net`,
            text: mensagem,
            textMessage: { text: mensagem }
          })
        });

        if (res.ok) {
          await supabaseAdmin
            .from('mensagens_pendentes')
            .update({ 
              status: 'enviado',
              atualizado_em: new Date().toISOString(),
              erro_log: null
            })
            .eq('id', id);
          sent++;
        } else {
          const errText = await res.text();
          await supabaseAdmin
            .from('mensagens_pendentes')
            .update({ 
              tentativas: tentativas + 1,
              status: tentativas + 1 >= 5 ? 'falhou' : 'pendente',
              erro_log: `HTTP ${res.status}: ${errText}`,
              atualizado_em: new Date().toISOString()
            })
            .eq('id', id);
        }
      } catch (sendError: any) {
        await supabaseAdmin
          .from('mensagens_pendentes')
          .update({ 
            tentativas: tentativas + 1,
            status: tentativas + 1 >= 5 ? 'falhou' : 'pendente',
            erro_log: `Exception: ${sendError.message}`,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', id);
      }
    }

    return NextResponse.json({ success: true, processed, sent });

  } catch (error: any) {
    console.error('Queue Processor Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
