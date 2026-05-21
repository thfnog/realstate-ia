import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isMockMode, getLeads } from '@/lib/mockDb';
import { getAuthFromCookies } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const imobiliaria_id = session.imobiliaria_id;

    if (isMockMode()) {
      const leads = getLeads().filter(l => l.imobiliaria_id === imobiliaria_id && l.grupo_nome);
      const uniqueGroupsMap = new Map<string, string>();
      leads.forEach(l => {
        if (l.grupo_nome && l.grupo_jid) {
          uniqueGroupsMap.set(l.grupo_jid, l.grupo_nome);
        }
      });
      const data = Array.from(uniqueGroupsMap.entries()).map(([grupo_jid, grupo_nome]) => ({
        grupo_jid,
        grupo_nome
      }));
      return NextResponse.json(data);
    } else {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('grupo_nome, grupo_jid')
        .eq('imobiliaria_id', imobiliaria_id)
        .not('grupo_nome', 'is', null);

      if (error) throw error;

      // De-duplicate in memory to avoid raw sql distinct complexities
      const uniqueGroupsMap = new Map<string, string>();
      (data || []).forEach((item: any) => {
        if (item.grupo_nome && item.grupo_jid) {
          uniqueGroupsMap.set(item.grupo_jid, item.grupo_nome);
        }
      });
      const result = Array.from(uniqueGroupsMap.entries()).map(([grupo_jid, grupo_nome]) => ({
        grupo_jid,
        grupo_nome
      }));

      return NextResponse.json(result);
    }
  } catch (err: any) {
    console.error('Error GET /api/leads/grupos:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
