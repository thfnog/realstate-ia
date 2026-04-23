import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchInstanceStatus } from '@/lib/whatsapp';

export const maxDuration = 60; // 60s limit
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 1. Fetch active brokers with whatsapp instances
    const { data: corretores, error } = await supabaseAdmin
      .from('corretores')
      .select('id, nome, whatsapp_instance, whatsapp_status')
      .eq('ativo', true)
      .not('whatsapp_instance', 'is', null);

    if (error) throw error;
    if (!corretores || corretores.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhuma instância configurada' });
    }

    let offlineCount = 0;
    const slackAlerts: string[] = [];

    // 2. Check each instance
    for (const corretor of corretores) {
      const currentStatus = await fetchInstanceStatus(corretor.whatsapp_instance);
      
      // Update DB if status changed
      if (currentStatus !== corretor.whatsapp_status) {
        await supabaseAdmin
          .from('corretores')
          .update({ whatsapp_status: currentStatus })
          .eq('id', corretor.id);
        
        // If it went offline, prepare Slack alert
        if (currentStatus !== 'open' && corretor.whatsapp_status === 'open') {
          slackAlerts.push(`🚨 *Instância Offline*: O WhatsApp de *${corretor.nome}* (${corretor.whatsapp_instance}) acabou de desconectar! Re-leitura de QR Code pode ser necessária.`);
        }
      }

      if (currentStatus !== 'open') {
        offlineCount++;
      }
    }

    // 3. Send Slack Alerts
    if (slackAlerts.length > 0) {
      const slackUrl = process.env.SLACK_WEBHOOK_URL;
      if (slackUrl) {
        try {
          await fetch(slackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: "⚠️ *Alerta Crítico ImobIA* ⚠️\n\n" + slackAlerts.join('\n\n')
            })
          });
        } catch (slackErr) {
          console.error('Falha ao enviar alerta para o Slack:', slackErr);
        }
      } else {
        console.warn('SLACK_WEBHOOK_URL não configurado. Alertas não enviados.');
      }
    }

    return NextResponse.json({ 
      success: true, 
      checked: corretores.length, 
      offline: offlineCount,
      alerts_sent: slackAlerts.length
    });

  } catch (error: any) {
    console.error('Health Check Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
