import { NextResponse } from 'next/server';
import { runDailyBriefing } from '@/lib/engine/dailyBriefing';

export async function GET(request: Request) {
  // Authorization check (Vercel Cron or manual with secret)
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production') {
     if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
     }
  }

  try {
    await runDailyBriefing();
    return NextResponse.json({ success: true, message: 'Briefings diários processados com sucesso.' });
  } catch (err: any) {
    console.error('❌ Erro no cron de briefing:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
