'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IoArrowBackOutline, IoSyncOutline, IoGlobeOutline } from 'react-icons/io5';
import { toast } from 'sonner';

export default function MasterIntegrationsPage() {
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const handleGlobalSync = async () => {
    setSyncing(true);
    setResults(null);
    try {
      const res = await fetch('/api/master/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Empty body means global sync
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Sincronização global executada com sucesso!');
        setResults(data.results || []);
      } else {
        toast.error(`Erro: ${data.error}`);
      }
    } catch (err) {
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setSyncing(false);
    }
  };

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
          <div className="flex items-center gap-3 text-emerald-600">
            <IoGlobeOutline size={32} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-50 px-3 py-1 rounded-lg">Master Sync</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Integrações Globais</h1>
          <p className="text-slate-500 font-medium text-lg max-w-xl">
            Gerencie e force a sincronização de todos os provedores de imóveis conectados à plataforma.
          </p>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-100">
              <IoSyncOutline size={24} className={syncing ? 'animate-spin' : ''} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Sincronização em Massa</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Widesys, eGO, Universal XML</p>
            </div>
          </div>
          <button
            onClick={handleGlobalSync}
            disabled={syncing}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-lg active:scale-95"
          >
            {syncing ? 'Sincronizando Plataforma...' : '🚀 Forçar Sincronização Global'}
          </button>
        </div>

        {results && (
          <div className="mt-8 bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest">Resultados da Sincronização</h4>
            {results.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma integração ativa encontrada no momento.</p>
            ) : (
              <div className="space-y-4">
                {results.map((r, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{r.success ? '✅' : '❌'}</span>
                      <div>
                        <p className="font-bold text-slate-900 capitalize text-sm">{r.provider}</p>
                        {r.error && <p className="text-xs text-rose-500 mt-1">{r.error}</p>}
                      </div>
                    </div>
                    {r.success && (
                      <div className="flex gap-6 text-center">
                        <div>
                          <p className="text-2xl font-black text-slate-900">{r.totalFetched}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Encontrados</p>
                        </div>
                        <div>
                          <p className="text-2xl font-black text-emerald-500">{r.totalInserted}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inseridos</p>
                        </div>
                        <div>
                          <p className="text-2xl font-black text-indigo-500">{r.totalUpdated}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atualizados</p>
                        </div>
                        <div>
                          <p className="text-2xl font-black text-rose-500">{r.totalDeactivated}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Desativados</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
