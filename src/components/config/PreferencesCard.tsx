'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Bell, Mail, MessageSquare, Save } from 'lucide-react';

export function PreferencesCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    pref_notif_whatsapp: true,
    pref_notif_email: true,
    pref_notif_push: true,
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(user => {
        if (user.corretor_id) {
           // In a real app we would fetch the specific broker data
           // For MVP/Mock, we can assume the session has it or fetch /api/corretores/me
           fetch('/api/corretores/' + user.corretor_id)
            .then(res => res.json())
            .then(data => {
               setPrefs({
                 pref_notif_whatsapp: data.pref_notif_whatsapp ?? true,
                 pref_notif_email: data.pref_notif_email ?? true,
                 pref_notif_push: data.pref_notif_push ?? true,
               });
               setLoading(false);
            });
        }
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/corretores/me/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });

      if (res.ok) {
        toast.success('Preferências atualizadas com sucesso!');
      } else {
        toast.error('Erro ao salvar preferências.');
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="h-64 bg-white animate-pulse rounded-2xl border border-border-light"></div>;

  return (
    <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="p-6 border-b border-border-light bg-slate-50/50">
        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> Preferências de Notificação
        </h3>
        <p className="text-xs text-text-muted mt-1">Escolha como você deseja ser avisado sobre novos leads e agendamentos.</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between p-4 rounded-xl border border-border-light bg-slate-50/30 hover:bg-white transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary">WhatsApp</h4>
              <p className="text-[11px] text-text-muted">Receba alertas instantâneos no seu WhatsApp.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={prefs.pref_notif_whatsapp}
              onChange={e => setPrefs({...prefs, pref_notif_whatsapp: e.target.checked})}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border border-border-light bg-slate-50/30 hover:bg-white transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary">E-mail</h4>
              <p className="text-[11px] text-text-muted">Resumo diário e alertas de novos leads.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={prefs.pref_notif_email}
              onChange={e => setPrefs({...prefs, pref_notif_email: e.target.checked})}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border border-border-light bg-slate-50/30 hover:bg-white transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary">Push Desktop</h4>
              <p className="text-[11px] text-text-muted">Notificações no navegador enquanto estiver logado.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={prefs.pref_notif_push}
              onChange={e => setPrefs({...prefs, pref_notif_push: e.target.checked})}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
          </label>
        </div>
      </div>

      <div className="p-6 bg-slate-50/50 border-t border-border-light flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Alterações
        </button>
      </div>
    </div>
  );
}
