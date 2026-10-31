'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  IoSparklesOutline,
  IoPeopleOutline,
  IoRefreshOutline,
  IoCheckmarkCircle,
  IoAddCircleOutline,
  IoTrashOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5';

interface MonitoredGroup {
  jid: string;
  name: string;
  enabled: boolean;
  last_seen_at?: string;
}

export function BotGroupSettingsCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [groupFilterMode, setGroupFilterMode] = useState<'allowlist' | 'all'>('allowlist');
  const [groups, setGroups] = useState<MonitoredGroup[]>([]);
  const [customRules, setCustomRules] = useState('');
  const [autoMatchGroups, setAutoMatchGroups] = useState(true);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupJid, setNewGroupJid] = useState('');

  useEffect(() => {
    loadSettings(false);
  }, []);

  async function loadSettings(sync: boolean) {
    if (sync) setSyncing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/admin/bot-settings${sync ? '?sync=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setGroupFilterMode(data.group_filter_mode || 'allowlist');
        setGroups(Array.isArray(data.monitored_groups) ? data.monitored_groups : []);
        setCustomRules(data.custom_rules || '');
        setAutoMatchGroups(data.auto_match_groups ?? true);
        if (sync) toast.success('Grupos sincronizados com o WhatsApp!');
      }
    } catch {
      toast.error('Erro ao carregar configurações do assistente.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }

  async function handleSave(overrideGroups?: MonitoredGroup[], overrideMode?: 'allowlist' | 'all') {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/bot-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_filter_mode: overrideMode ?? groupFilterMode,
          monitored_groups: overrideGroups ?? groups,
          custom_rules: customRules,
          auto_match_groups: autoMatchGroups,
        }),
      });

      if (res.ok) {
        toast.success('Configurações da IA e Radar de Grupos salvas!');
      } else {
        toast.error('Falha ao salvar configurações.');
      }
    } catch {
      toast.error('Erro de conexão ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  function toggleGroup(jid: string) {
    const updated = groups.map((g) => (g.jid === jid ? { ...g, enabled: !g.enabled } : g));
    setGroups(updated);
    handleSave(updated);
  }

  function removeGroup(jid: string) {
    const updated = groups.filter((g) => g.jid !== jid);
    setGroups(updated);
    handleSave(updated);
  }

  function handleAddManualGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast.warning('Informe o nome do grupo.');
      return;
    }
    const cleanJid = newGroupJid.trim()
      ? newGroupJid.trim().includes('@g.us')
        ? newGroupJid.trim()
        : `${newGroupJid.trim().replace(/\D/g, '')}@g.us`
      : `manual-${Date.now()}@g.us`;

    const updated: MonitoredGroup[] = [
      ...groups,
      { jid: cleanJid, name: newGroupName.trim(), enabled: true, last_seen_at: new Date().toISOString() },
    ];
    setGroups(updated);
    setNewGroupName('');
    setNewGroupJid('');
    handleSave(updated);
  }

  if (loading) {
    return <div className="h-72 bg-white animate-pulse rounded-[3rem] border border-slate-100" />;
  }

  const enabledCount = groups.filter((g) => g.enabled).length;

  return (
    <div className="space-y-8">
      {/* 1. REGRAS PERSONALIZADAS DO CORRETOR */}
      <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-xl shadow-slate-200/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
              <IoSparklesOutline size={28} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Regras do Meu Atendimento (IA)
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Ensine ao bot como você trabalha (regiões, financiamento, permuta e regras de visita)
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="px-8 py-4 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Regras IA'}
          </button>
        </div>

        <textarea
          rows={4}
          value={customRules}
          onChange={(e) => setCustomRules(e.target.value)}
          placeholder="Ex: Atuo na Zona Sul de SP (Moema, Itaim e Vila Mariana). Trabalho com imóveis acima de R$ 600 mil, aceito financiamento bancário e estudo permuta até 40% do valor. Visitas devem ser agendadas com 2h de antecedência."
          className="w-full p-6 rounded-3xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none text-sm font-medium text-slate-700 leading-relaxed transition-all"
        />
        <p className="text-[11px] text-slate-400 font-bold mt-3 ml-2">
          💡 Essas diretrizes entram diretamente no cérebro do seu assistente e evitam que ele prometa condições que você não pratica.
        </p>
      </div>

      {/* 2. RADAR DE GRUPOS WHATSAPP (ALLOWLIST) */}
      <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-xl shadow-slate-200/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-100">
              <IoPeopleOutline size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  Radar Inteligente de Grupos
                </h2>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                  {groupFilterMode === 'allowlist' ? `${enabledCount} Monitorados` : 'Todos Ativos'}
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium">
                Escolha quais grupos de corretores/condomínios a IA deve vigiar para achar negócios
              </p>
            </div>
          </div>

          <button
            onClick={() => loadSettings(true)}
            disabled={syncing}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-200 disabled:opacity-50"
          >
            <IoRefreshOutline size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando...' : 'Carregar Grupos do WhatsApp'}
          </button>
        </div>

        {/* Seletor de Modo: Allowlist vs Todos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            type="button"
            onClick={() => {
              setGroupFilterMode('allowlist');
              handleSave(groups, 'allowlist');
            }}
            className={`p-5 rounded-3xl border text-left transition-all flex items-start gap-4 ${
              groupFilterMode === 'allowlist'
                ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <IoShieldCheckmarkOutline
              size={24}
              className={groupFilterMode === 'allowlist' ? 'text-emerald-600 mt-0.5' : 'text-slate-400 mt-0.5'}
            />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-900">
                Apenas Grupos Autorizados (Recomendado)
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Ignora grupos pessoais/família. A IA analisa somente os grupos que você ativar na lista abaixo.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setGroupFilterMode('all');
              handleSave(groups, 'all');
            }}
            className={`p-5 rounded-3xl border text-left transition-all flex items-start gap-4 ${
              groupFilterMode === 'all'
                ? 'bg-indigo-50/70 border-indigo-300 shadow-sm'
                : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <IoCheckmarkCircle
              size={24}
              className={groupFilterMode === 'all' ? 'text-indigo-600 mt-0.5' : 'text-slate-400 mt-0.5'}
            />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-900">
                Monitorar Todos os Grupos
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Analisa qualquer grupo em que seu número esteja conectado e filtra conversas sociais via IA.
              </p>
            </div>
          </button>
        </div>

        {/* Lista de Grupos */}
        <div className="space-y-3 mb-8">
          {groups.length === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-50 border border-dashed border-slate-200 text-center">
              <p className="text-sm font-bold text-slate-600">Nenhum grupo listado ainda.</p>
              <p className="text-xs text-slate-400 mt-1">
                Clique em &ldquo;Carregar Grupos do WhatsApp&rdquo; acima ou aguarde novas mensagens chegarem para ativá-los aqui.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.jid}
                className={`flex items-center justify-between p-4 px-6 rounded-2xl border transition-all ${
                  group.enabled
                    ? 'bg-emerald-50/30 border-emerald-200'
                    : 'bg-slate-50/60 border-slate-100 opacity-75'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      group.enabled ? 'bg-emerald-500 shadow-sm shadow-emerald-300' : 'bg-slate-300'
                    }`}
                  />
                  <div className="truncate">
                    <p className="text-sm font-bold text-slate-800 truncate">{group.name}</p>
                    <p className="text-[11px] font-mono text-slate-400 truncate">{group.jid}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.jid)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      group.enabled
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {group.enabled ? 'Monitorando' : 'Ignorado'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeGroup(group.jid)}
                    title="Remover da lista"
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <IoTrashOutline size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Adicionar grupo manualmente */}
        <form onSubmit={handleAddManualGroup} className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Nome do Grupo (ex: Parcerias Zona Sul)"
            className="flex-1 px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:bg-white"
          />
          <input
            type="text"
            value={newGroupJid}
            onChange={(e) => setNewGroupJid(e.target.value)}
            placeholder="JID opcional (ex: 1203630...@g.us)"
            className="sm:w-64 px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 outline-none focus:bg-white"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
          >
            <IoAddCircleOutline size={16} /> Adicionar Grupo
          </button>
        </form>
      </div>
    </div>
  );
}
