import { NextResponse } from 'next/server';
import { sendSlackNotification } from '@/lib/slack';
import { getAuthFromCookies } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session || session.app_role !== 'admin') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const body = await request.json();
    const { message = 'Este é um teste de integração do ImobIA.', type = 'system' } = body;

    const success = await sendSlackNotification(message, type, {
      username: `Teste Admin: ${session.email}`
    });

    if (success) {
      return NextResponse.json({ success: true, message: 'Alerta enviado para o Slack!' });
    } else {
      return NextResponse.json({ 
        error: 'Falha ao enviar para o Slack. Verifique a variável SLACK_WEBHOOK_URL.' 
      }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno: ' + err.message }, { status: 500 });
  }
}
