'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ContratoComDetalhes, ContratoStatus } from '@/lib/database.types';

export default function ContratosPage() {
  const [contratos, setContratos] = useState<ContratoComDetalhes[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ContratoStatus | 'all'>('all');

  useEffect(() => {
    const url = filter === 'all' ? '/api/contratos' : `/api/contratos?status=${filter}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setContratos(data);
        setLoading(false);
      });
  }, [filter]);

  const getStatusColor = (status: ContratoStatus) => {
    switch (status) {
      case 'ativo': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'assinatura_pendente': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'vencido': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Contratos</h1>
          <p className="text-slate-500 mt-1">Acompanhe vendas, aluguéis e fluxos de assinatura.</p>
        </div>
        <Link 
          href="/admin/contratos/novo" 
          className="px-6 py-3 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          ➕ Novo Contrato
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'rascunho', 'assinatura_pendente', 'ativo', 'vencido'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as any)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all whitespace-nowrap ${
              filter === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {s === 'all' ? 'Todos' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-3xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contratos.length > 0 ? contratos.map((c) => (
            <div key={c.id} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col">
              <div className="p-6 flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(c.status)}`}>
                    {c.status.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.tipo}</span>
                </div>

                <div>
                  <h3 className="font-black text-slate-900 line-clamp-1">{c.imovel?.titulo || 'Imóvel sem título'}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    👤 {c.lead?.nome || 'Lead s/ nome'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-50 flex justify-between items-end">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor do Negócio</p>
                      <p className="text-xl font-black text-primary">
                        {c.valor_total.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                        {c.tipo === 'aluguel' && <span className="text-xs font-medium text-slate-400">/mês</span>}
                      </p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Início</p>
                      <p className="text-xs font-bold text-slate-700">{new Date(c.data_inicio).toLocaleDateString('pt-PT')}</p>
                   </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <Link 
                  href={`/admin/contratos/${c.id}`}
                  className="flex-1 text-center py-2 bg-white text-slate-900 text-xs font-black rounded-xl border border-slate-200 hover:bg-slate-100 transition-all"
                >
                  Gerenciar
                </Link>
                <a 
                  href={`/api/contratos/${c.id}/gerar`}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center"
                  title="Baixar Contrato"
                >
                  📥
                </a>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
               <p className="text-slate-400 font-bold italic">Nenhum contrato encontrado nesta categoria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
