import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchInstanceStatus } from '@/lib/whatsapp';
import * as mock from '@/lib/mockDb';

/**
 * GET: Force synchronize all active broker WhatsApp instance statuses
 */
export async function GET() {
  try {
    if (mock.isMockMode()) {
       return NextResponse.json({ success: true, mode: 'mock', message: 'No sync needed in mock mode' });
    }

    // 1. Fetch all active brokers with instances
    const { data: brokers, error } = await supabaseAdmin
      .from('corretores')
      .select('id, whatsapp_instance, nome')
      .eq('ativo', true);

    if (error) throw error;

    const results = [];

    // 2. Poll Evolution API for each instance status
    for (const broker of brokers) {
      if (broker.whatsapp_instance) {
        const liveStatus = await fetchInstanceStatus(broker.whatsapp_instance);
        
        // Update DB
        const { error: updateError } = await supabaseAdmin
          .from('corretores')
          .update({ whatsapp_status: liveStatus })
          .eq('id', broker.id);
        
        results.push({
          id: broker.id,
          nome: broker.nome,
          instance: broker.whatsapp_instance,
          status: liveStatus,
          updated: !updateError
        });
      }
    }

    return NextResponse.json({
      success: true,
      synced_at: new Date().toISOString(),
      brokers: results
    });

  } catch (error: any) {
    console.error('❌ Erro na sincronização manual de WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
