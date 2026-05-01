'use client';

import { useEffect, useState } from 'react';
import type { LeadComCorretor } from '@/lib/database.types';
import { PlanGuard } from '@/components/PlanGuard';

export default function CarteiraPage() {
  const [leads, setLeads] = useState<LeadComCorretor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await fetch('/api/leads');
        const data = await res.json();
        if (Array.isArray(data)) {
          // Only show leads that have an assigned broker (attended leads)
          setLeads(data.filter((l: LeadComCorretor) => l.corretor_id));
        }
      } catch (err) {
        console.error('Erro:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, []);

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.nome.toLowerCase().includes(s) ||
      l.telefone.includes(s) ||
      l.corretores?.nome.toLowerCase().includes(s)
    );
  });

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  return (
    <PlanGuard requiredModule="operacao">
      <div className="animate-fade-in space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão da Carteira</h1>
            <p className="text-slate-500 font-medium">Acompanhe a distribuição e o desempenho de leads por consultor.</p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-2">
                <span className="text-xl">👥</span>
                <div>
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ativos</p>
                   <p className="text-sm font-black text-emerald-700">{leads.length}</p>
                </div>
             </div>
             <div className="bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 flex items-center gap-2">
                <span className="text-xl">💰</span>
                <div>
                   <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Potencial</p>
                   <p className="text-sm font-black text-indigo-700">
                     {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
                       leads.reduce((acc, curr) => acc + (curr.orcamento || 0), 0)
                     )}
                   </p>
                </div>
             </div>
          </div>
        </div>

        {/* Search & Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="relative group">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cliente, telefone ou consultor..."
                className="w-full pl-12 pr-6 py-4 rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
              />
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl grayscale group-focus-within:grayscale-0 transition-all">🔍</span>
            </div>
          </div>
          
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 flex items-center justify-between shadow-xl shadow-slate-200/50">
             <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Média / Corretor</p>
                <p className="text-2xl font-black text-slate-900">
                   {(leads.length / (new Set(leads.map(l => l.corretor_id)).size || 1)).toFixed(1)}
                </p>
             </div>
             <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl">📊</div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-48 bg-slate-50 rounded-[2.5rem] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-[3rem] border border-dashed border-slate-200 p-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-inner">📭</div>
            <div>
               <p className="text-xl font-black text-slate-900">
                 {search ? 'Nenhum resultado' : 'Carteira Vazia'}
               </p>
               <p className="text-slate-500 font-medium">
                 {search ? 'Tente outros termos de busca.' : 'Aguardando a distribuição de leads para os corretores.'}
               </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((lead) => (
              <div key={lead.id} className="group bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-primary/10 transition-all hover:-translate-y-1 relative overflow-hidden">
                {/* Status Badge */}
                <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl font-black text-[9px] uppercase tracking-widest ${
                  lead.status === 'fechado' ? 'bg-emerald-500 text-white' : 
                  lead.status === 'negociacao' ? 'bg-indigo-500 text-white' : 
                  'bg-slate-100 text-slate-500'
                }`}>
                  {lead.status.replace('_', ' ')}
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-2xl shadow-inner">
                      👤
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg leading-tight group-hover:text-primary transition-colors">{lead.nome}</h3>
                      <p className="text-slate-400 text-xs font-bold font-mono">{lead.telefone}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Consultor</p>
                       <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] flex items-center justify-center font-black">
                             {lead.corretores?.nome?.charAt(0)}
                          </span>
                          <span className="text-xs font-black text-slate-700">{lead.corretores?.nome.split(' ')[0]}</span>
                       </div>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Potencial</p>
                       <p className="text-xs font-black text-slate-900">
                          {lead.orcamento ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(lead.orcamento) : '—'}
                       </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Desde</span>
                       <span className="text-[10px] font-bold text-slate-600">{formatDate(lead.criado_em)}</span>
                    </div>
                    <a 
                      href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
                    >
                      <span className="text-xl">💬</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PlanGuard>
  );
}
  );
}
