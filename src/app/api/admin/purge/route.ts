import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthFromCookies } from '@/lib/auth';
import * as mock from '@/lib/mockDb';

/**
 * POST /api/admin/purge
 * EXTREMELY DANGEROUS: Deletes ALL leads and events for the current imobiliaria.
 */
export async function POST() {
  try {
    const session = await getAuthFromCookies();

    // 1. Authorization Check
    if (!session || session.app_role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const imobId = session.imobiliaria_id;

    if (mock.isMockMode()) {
      mock.purgeLeads(imobId);
      return NextResponse.json({ success: true, count: 'all_mock' });
    }

    // 2. Production (Supabase) Purge
    // Delete events first due to foreign keys (if not cascading)
    // We fetch lead IDs first to ensure we only delete events for this imobiliaria
    const { data: leadsToDelete } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('imobiliaria_id', imobId);

    const ids = leadsToDelete?.map(l => l.id) || [];

    if (ids.length > 0) {
      // Clear associated events
      await supabaseAdmin
        .from('eventos')
        .delete()
        .in('lead_id', ids);

      // Clear the leads themselves
      const { error, count } = await supabaseAdmin
        .from('leads')
        .delete()
        .eq('imobiliaria_id', imobId);

      if (error) throw error;
      
      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json({ success: true, count: 0 });

  } catch (error: any) {
    console.error('❌ Erro no Purge Leads:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
