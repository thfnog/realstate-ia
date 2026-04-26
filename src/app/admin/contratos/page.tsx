'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { IoAddOutline, IoDocumentTextOutline, IoDownloadOutline, IoPersonOutline, IoKeyOutline, IoChevronBackOutline, IoChevronForwardOutline } from 'react-icons/io5';
import { LoadingSkeleton, TableRowSkeleton } from '@/components/LoadingSkeleton';
import { getConfig } from '@/lib/countryConfig';

export default function ContratosPage() {
  const [contratos, setContratos] = useState<any[]>([]);
  const config = getConfig();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<any | 'all'>('all');

  useEffect(() => {
    const url = filter === 'all' ? '/api/contratos' : `/api/contratos?status=${filter}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setContratos(data);
        setLoading(false);
      });
  }, [filter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'pendente': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'finalizado': return 'bg-slate-50 text-slate-500 border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12">
          <IoDocumentTextOutline size={200} />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
            <IoDocumentTextOutline /> Jurídico & Locação
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Contratos Ativos</h1>
          <p className="text-slate-500 font-medium max-w-md">Gestão de minutas, assinaturas digitais e acompanhamento de vigência.</p>
        </div>

        <div className="flex items-center gap-4 relative z-10">
           <button className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-slate-900/10 active:scale-95">
              <IoAddOutline size={18} /> Novo Contrato
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
           <div className="flex gap-2">
             {['all', 'ativo', 'pendente', 'finalizado'].map(f => (
               <button 
                 key={f}
                 onClick={() => setFilter(f as any)}
                 className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
               >
                 {f === 'all' ? 'Todos' : f}
               </button>
             ))}
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8">
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 space-y-6 shadow-xl shadow-slate-200/50">
                 <LoadingSkeleton className="h-40 w-full rounded-2xl" />
              </div>
            ))
          ) : contratos.length > 0 ? (
            contratos.map((c) => (
              <div key={c.id} className="group flex flex-col p-8 bg-white rounded-[2.5rem] border border-slate-100 hover:border-primary/30 transition-all hover:shadow-2xl hover:shadow-slate-200/50">
                <div className="flex justify-between items-start mb-6">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(c.status)}`}>
                    {c.status}
                  </span>
                  <IoKeyOutline className="text-slate-300" size={20} />
                </div>

                <h3 className="text-xl font-black text-slate-900 line-clamp-2 leading-tight group-hover:text-primary transition-colors mb-4">{c.imovel?.titulo || 'Contrato de Locação'}</h3>
                
                <div className="flex items-center gap-3 mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <IoPersonOutline size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inquilino</p>
                    <p className="text-xs font-black text-slate-900">{c.lead?.nome || 'N/A'}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-50 flex justify-between items-end mt-auto">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vencimento Mensal</p>
                      <p className="text-2xl font-black text-slate-900 tracking-tighter">
                        {c.valor_total?.toLocaleString(config.currency.locale, { style: 'currency', currency: config.currency.code })}
                      </p>
                   </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <Link 
                    href={`/admin/contratos/${c.id}`}
                    className="flex-1 text-center py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-slate-900/10 hover:bg-primary transition-all active:scale-95"
                  >
                    Ver Detalhes
                  </Link>
                  <button className="p-4 bg-white text-slate-400 rounded-2xl border border-slate-100 hover:text-primary hover:border-primary transition-all">
                    <IoDownloadOutline size={20} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-32 text-center">
               <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Nenhum contrato encontrado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
