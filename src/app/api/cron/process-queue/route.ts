import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { processQueueItem } from '@/lib/engine/webhookProcessor';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Security check (Cron Secret)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Fetch pending items
    // We pick items that are 'pendente' or 'erro' with low retry count
    const { data: items, error } = await supabaseAdmin
      .from('webhook_ingestion_queue')
      .select('*')
      .or('status.eq.pendente,status.eq.erro')
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(10); // Process 10 at a time

    if (error) throw error;

    if (!items || items.length === 0) {
      return NextResponse.json({ message: 'No items to process' });
    }

    console.log(`[Cron] Processing ${items.length} queue items...`);

    // 3. Process in parallel (limited)
    const results = await Promise.allSettled(
      items.map(item => processQueueItem(item))
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      processed: items.length,
      success: successCount,
      failed: failureCount
    });

  } catch (err: any) {
    console.error('[Cron] Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
