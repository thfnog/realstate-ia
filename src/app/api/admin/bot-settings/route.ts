import { NextResponse } from 'next/server';
import { getAuthFromCookies } from '@/lib/auth';
import { getBotSettings, saveBotSettings, MonitoredGroup } from '@/lib/botSettings';
import { fetchInstanceGroups } from '@/lib/whatsapp';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const syncEvolution = searchParams.get('sync') === 'true';

  try {
    const settings = await getBotSettings(session.imobiliaria_id);
    const groupMap = new Map<string, MonitoredGroup>();

    for (const g of settings.monitored_groups) {
      groupMap.set(g.jid, g);
    }

    // Also include groups previously seen in leads table
    if (mock.isMockMode()) {
      const leads = mock.getLeads().filter((l) => l.imobiliaria_id === session.imobiliaria_id && l.grupo_jid);
      for (const l of leads) {
        if (l.grupo_jid && !groupMap.has(l.grupo_jid)) {
          groupMap.set(l.grupo_jid, {
            jid: l.grupo_jid,
            name: l.grupo_nome || `Grupo ${l.grupo_jid.slice(0, 8)}`,
            enabled: settings.group_filter_mode === 'all',
          });
        }
      }
      // Seed demo groups in mock mode if empty so the UI is immediately testable
      if (groupMap.size === 0) {
        groupMap.set('120363044556677@g.us', {
          jid: '120363044556677@g.us',
          name: 'Parcerias Imobiliárias Zona Sul SP',
          enabled: true,
        });
        groupMap.set('120363099887766@g.us', {
          jid: '120363099887766@g.us',
          name: 'Corretores Alto Padrão Itaim / Moema',
          enabled: true,
        });
        groupMap.set('120363011223344@g.us', {
          jid: '120363011223344@g.us',
          name: 'Condomínio & Família (Ignorado)',
          enabled: false,
        });
      }
    } else {
      const { data: leadGroups } = await supabaseAdmin
        .from('leads')
        .select('grupo_jid, grupo_nome')
        .eq('imobiliaria_id', session.imobiliaria_id)
        .not('grupo_jid', 'is', null);

      for (const lg of leadGroups || []) {
        if (lg.grupo_jid && !groupMap.has(lg.grupo_jid)) {
          groupMap.set(lg.grupo_jid, {
            jid: lg.grupo_jid,
            name: lg.grupo_nome || `Grupo ${lg.grupo_jid.slice(0, 8)}`,
            enabled: false,
          });
        }
      }

      if (syncEvolution) {
        const { data: corretores } = await supabaseAdmin
          .from('corretores')
          .select('id, whatsapp_instance')
          .eq('imobiliaria_id', session.imobiliaria_id)
          .eq('ativo', true);

        for (const c of corretores || []) {
          const instanceName = c.whatsapp_instance || `realstate-iabroker-${c.id}`;
          const evoGroups = await fetchInstanceGroups(instanceName);
          for (const eg of evoGroups) {
            const existing = groupMap.get(eg.jid);
            groupMap.set(eg.jid, {
              jid: eg.jid,
              name: eg.name || existing?.name || eg.jid,
              enabled: existing ? existing.enabled : false,
              last_seen_at: new Date().toISOString(),
            });
          }
        }
      }
    }

    const mergedGroups = Array.from(groupMap.values());
    if (mergedGroups.length !== settings.monitored_groups.length || syncEvolution) {
      await saveBotSettings(session.imobiliaria_id, { monitored_groups: mergedGroups });
    }

    return NextResponse.json({
      ...settings,
      monitored_groups: mergedGroups,
    });
  } catch (err: any) {
    console.error('Error GET /api/admin/bot-settings:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const updated = await saveBotSettings(session.imobiliaria_id, {
      group_filter_mode: body.group_filter_mode,
      monitored_groups: body.monitored_groups,
      custom_rules: body.custom_rules,
      auto_match_groups: body.auto_match_groups,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('Error PATCH /api/admin/bot-settings:', err);
    return NextResponse.json({ error: err.message || 'Erro ao salvar configurações do bot' }, { status: 500 });
  }
}
