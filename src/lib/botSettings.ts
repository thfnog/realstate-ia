/**
 * Bot Settings & WhatsApp Group Allowlist Manager
 *
 * Persists per-tenant AI rules and monitored WhatsApp groups using
 * `imobiliaria_integracoes` (provider = 'bot_settings') in Supabase,
 * with an in-memory store for Mock Mode.
 */

import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';

export interface MonitoredGroup {
  jid: string;
  name: string;
  enabled: boolean;
  last_seen_at?: string;
}

export interface BotSettings {
  imobiliaria_id: string;
  group_filter_mode: 'allowlist' | 'all';
  monitored_groups: MonitoredGroup[];
  custom_rules: string;
  auto_match_groups: boolean;
}

const DEFAULT_CUSTOM_RULES =
  'Atendimento focado em compra, venda e locação. Visitas mediante agendamento prévio. Propostas e negociações de valores são validadas diretamente pelo corretor.';

// In-memory store for mock mode / fast fallback
const memorySettings = new Map<string, BotSettings>();

function buildDefaultSettings(imobiliariaId: string): BotSettings {
  return {
    imobiliaria_id: imobiliariaId,
    group_filter_mode: 'allowlist',
    monitored_groups: [],
    custom_rules: DEFAULT_CUSTOM_RULES,
    auto_match_groups: true,
  };
}

export async function getBotSettings(imobiliariaId: string): Promise<BotSettings> {
  if (!imobiliariaId) return buildDefaultSettings(mock.DEFAULT_IMOBILIARIA_ID);

  if (mock.isMockMode()) {
    const existing = memorySettings.get(imobiliariaId);
    if (existing) return existing;
    const def = buildDefaultSettings(imobiliariaId);
    memorySettings.set(imobiliariaId, def);
    return def;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('imobiliaria_integracoes')
      .select('config')
      .eq('imobiliaria_id', imobiliariaId)
      .eq('provider', 'bot_settings')
      .maybeSingle();

    if (error || !data || !data.config) {
      return memorySettings.get(imobiliariaId) || buildDefaultSettings(imobiliariaId);
    }

    const cfg = data.config as Partial<BotSettings>;
    const merged: BotSettings = {
      imobiliaria_id: imobiliariaId,
      group_filter_mode: cfg.group_filter_mode || 'allowlist',
      monitored_groups: Array.isArray(cfg.monitored_groups) ? cfg.monitored_groups : [],
      custom_rules: typeof cfg.custom_rules === 'string' ? cfg.custom_rules : DEFAULT_CUSTOM_RULES,
      auto_match_groups: cfg.auto_match_groups ?? true,
    };

    memorySettings.set(imobiliariaId, merged);
    return merged;
  } catch (err) {
    console.warn('⚠️ [botSettings] Fallback para memória:', err);
    return memorySettings.get(imobiliariaId) || buildDefaultSettings(imobiliariaId);
  }
}

export async function saveBotSettings(
  imobiliariaId: string,
  partial: Partial<Omit<BotSettings, 'imobiliaria_id'>>
): Promise<BotSettings> {
  const current = await getBotSettings(imobiliariaId);
  const updated: BotSettings = {
    ...current,
    ...partial,
    imobiliaria_id: imobiliariaId,
    monitored_groups: partial.monitored_groups ?? current.monitored_groups,
  };

  memorySettings.set(imobiliariaId, updated);

  if (!mock.isMockMode()) {
    try {
      await supabaseAdmin
        .from('imobiliaria_integracoes')
        .upsert(
          {
            imobiliaria_id: imobiliariaId,
            provider: 'bot_settings',
            config: {
              group_filter_mode: updated.group_filter_mode,
              monitored_groups: updated.monitored_groups,
              custom_rules: updated.custom_rules,
              auto_match_groups: updated.auto_match_groups,
            },
            active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'imobiliaria_id,provider' }
        );
    } catch (err) {
      console.error('❌ [botSettings] Erro ao persistir no Supabase:', err);
    }
  }

  return updated;
}

/**
 * Checks if a WhatsApp group is allowed to be processed by the AI radar.
 * Also auto-registers newly seen groups (with enabled=false in allowlist mode)
 * so the broker can easily toggle them ON in the dashboard.
 */
export async function checkAndRegisterGroup(params: {
  imobiliariaId: string;
  groupJid: string;
  groupName?: string;
}): Promise<{ allowed: boolean; reason: string }> {
  const { imobiliariaId, groupJid, groupName } = params;
  if (!groupJid) return { allowed: false, reason: 'JID do grupo vazio' };

  const settings = await getBotSettings(imobiliariaId);
  const cleanJid = groupJid.trim();
  const existingIdx = settings.monitored_groups.findIndex((g) => g.jid === cleanJid);

  if (existingIdx === -1) {
    // Auto-discover group so the broker can see it in the UI without typing JIDs
    const isAllowedByDefault = settings.group_filter_mode === 'all';
    const newGroup: MonitoredGroup = {
      jid: cleanJid,
      name: groupName || `Grupo ${cleanJid.split('@')[0].slice(-6)}`,
      enabled: isAllowedByDefault,
      last_seen_at: new Date().toISOString(),
    };
    const nextGroups = [...settings.monitored_groups, newGroup];
    await saveBotSettings(imobiliariaId, { monitored_groups: nextGroups });

    return {
      allowed: isAllowedByDefault,
      reason: isAllowedByDefault
        ? 'Modo "todos os grupos" ativo'
        : `Grupo recém-descoberto (${newGroup.name}) adicionado como inativo na allowlist`,
    };
  }

  const group = settings.monitored_groups[existingIdx];
  // Update group name or last_seen_at if changed
  if (groupName && group.name !== groupName) {
    settings.monitored_groups[existingIdx] = {
      ...group,
      name: groupName,
      last_seen_at: new Date().toISOString(),
    };
    await saveBotSettings(imobiliariaId, { monitored_groups: settings.monitored_groups });
  }

  if (settings.group_filter_mode === 'all') {
    return { allowed: true, reason: 'Modo "todos os grupos" ativo' };
  }

  if (!group.enabled) {
    return { allowed: false, reason: `Grupo "${group.name}" desativado na allowlist` };
  }

  return { allowed: true, reason: `Grupo "${group.name}" autorizado na allowlist` };
}
