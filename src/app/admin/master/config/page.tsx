'use client';

import { useState, useEffect } from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { IoSettingsOutline, IoMailOutline, IoLogoSlack, IoSaveOutline, IoShieldCheckmarkOutline, IoArrowBackOutline } from 'react-icons/io5';
import { toast } from 'sonner';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

export default function MasterConfigPage() {
  const [config, setConfig] = useState({
    resend_api_key: '',
    resend_from_email: '',
    slack_webhook_url: '',
    slack_channel_leads: '',
    slack_channel_system: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/master/config');
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (err) {
        toast.error('Erro ao carregar configurações');
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/master/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        toast.success('Configurações salvas com sucesso!');
      } else {
        toast.error('Erro ao salvar');
      }
    } catch (err) {
      toast.error('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in p-10">
        <LoadingSkeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <LoadingSkeleton className="h-64 rounded-3xl" />
          <LoadingSkeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-10 max-w-6xl mx-auto space-y-12 pb-20">
      <Link 
        href="/admin/master" 
        className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-all font-black text-[10px] uppercase tracking-widest group"
      >
        <IoArrowBackOutline className="group-hover:-translate-x-1 transition-transform" size={16} />
        Voltar ao Painel Master
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-indigo-600">
            <IoShieldCheckmarkOutline size={32} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-indigo-50 px-3 py-1 rounded-lg">Master Control</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Infraestrutura Global</h1>
          <p className="text-slate-500 font-medium text-lg max-w-xl">
            Gerencie as chaves de API e integrações críticas que sustentam toda a plataforma.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* RESEND CONFIG */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-lg shadow-rose-100">
                <IoMailOutline size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">E-mail (Resend)</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fallback para Auth & Notificações</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">API Key</label>
                <input 
                  type="password"
                  value={config.resend_api_key || ''}
                  onChange={e => setConfig({...config, resend_api_key: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                  placeholder="re_..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From Email</label>
                <input 
                  type="text"
                  value={config.resend_from_email || ''}
                  onChange={e => setConfig({...config, resend_from_email: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                  placeholder="ImobIA <convite@imobia.com.br>"
                />
              </div>
            </div>
          </div>

          {/* SLACK CONFIG */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-100">
                <IoLogoSlack size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Notificações Slack</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Webhooks para Monitoramento</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Webhook URL</label>
                <input 
                  type="password"
                  value={config.slack_webhook_url || ''}
                  onChange={e => setConfig({...config, slack_webhook_url: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Canal de Leads</label>
                  <input 
                    type="text"
                    value={config.slack_channel_leads || ''}
                    onChange={e => setConfig({...config, slack_channel_leads: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    placeholder="#leads"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Canal do Sistema</label>
                  <input 
                    type="text"
                    value={config.slack_channel_system || ''}
                    onChange={e => setConfig({...config, slack_channel_system: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    placeholder="#sistema"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-3 px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-primary transition-all shadow-2xl shadow-slate-900/10 active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : <><IoSaveOutline size={20} /> Salvar Configurações</>}
          </button>
        </div>
      </form>

      <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 flex items-start gap-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-200 text-amber-700 flex items-center justify-center shrink-0">
          <IoShieldCheckmarkOutline size={24} />
        </div>
        <div>
          <p className="text-amber-900 font-black text-sm uppercase tracking-widest mb-2">Atenção Master</p>
          <p className="text-amber-700/70 text-sm font-medium leading-relaxed">
            As alterações nestas chaves afetam instantaneamente o envio de e-mails de convite e notificações de leads em toda a plataforma. Certifique-se de validar as chaves antes de salvar.
          </p>
        </div>
      </div>
    </div>
  );
}
