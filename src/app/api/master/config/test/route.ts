import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthFromCookies } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session || session.app_role !== 'master') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { type, to: customTo } = await request.json();
    
    // Get current config
    const { data: config } = await supabaseAdmin
      .from('configuracoes_sistema')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (!config || !config.slack_webhook_url) {
      return NextResponse.json({ error: 'Configuração não encontrada no banco. Salve no painel primeiro.' }, { status: 404 });
    }

    if (type === 'resend') {
      if (!config.resend_api_key) return NextResponse.json({ error: 'API Key do Resend não configurada' }, { status: 400 });
      
      const { Resend } = await import('resend');
      const resend = new Resend(config.resend_api_key);
      
      const from = config.resend_from_email || 'ImobIA <convite@imobia.com.br>';
      const to = customTo || session.email;

      const { data, error } = await resend.emails.send({
        from,
        to,
        subject: '🧪 Teste de Configuração ImobIA',
        html: `
          <div style="font-family: sans-serif; padding: 40px; border: 1px solid #eee; border-radius: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Teste de Conectividade</h2>
            <p>Olá, Master!</p>
            <p>Este é um e-mail de teste para validar sua configuração no **Resend**.</p>
            <p style="color: #64748b; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
              Enviado em: ${new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        `
      });

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (type === 'slack') {
      if (!config.slack_webhook_url) return NextResponse.json({ error: 'Webhook URL do Slack não configurada' }, { status: 400 });
      
      const channel = config.slack_channel || '#alertas';
      
      const response = await fetch(config.slack_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          username: 'ImobIA Monitor',
          icon_emoji: ':white_check_mark:',
          text: `🧪 *Teste de Integração Master*\nAs configurações de notificação do Slack foram validadas com sucesso por *${session.email}*.`,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erro Slack: ${errText}`);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Tipo de teste inválido' }, { status: 400 });
  } catch (err: any) {
    console.error('[CONFIG TEST ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
