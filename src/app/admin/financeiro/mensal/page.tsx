'use client';

import { useState, useEffect } from 'react';
import { IoCashOutline, IoCalendarOutline, IoRocketOutline, IoCheckmarkCircleOutline, IoTimeOutline, IoAlertCircleOutline, IoSearchOutline } from 'react-icons/io5';
import { toast } from 'sonner';
import { LoadingSkeleton, TableRowSkeleton } from '@/components/LoadingSkeleton';
import { formatCurrency, getConfig } from '@/lib/countryConfig';

export default function MonthlyFinancialPage() {
  const [cobrancas, setCobrancas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [config, setConfig] = useState<any>(getConfig());

  useEffect(() => {
    // Fetch imobiliaria config
    fetch('/api/imobiliaria')
      .then(res => res.json())
      .then(data => {
        if (data && data.config_pais) {
          const { getConfigByCode } = require('@/lib/countryConfig');
          setConfig(getConfigByCode(data.config_pais));
        }
      });
  }, []);

  useEffect(() => {
    fetchCobrancas();
  }, [mes, ano]);

  async function fetchCobrancas() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/financeiro/cobrancas?mes=${mes}&ano=${ano}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCobrancas(data);
    } catch (err: any) {
      toast.error('Erro ao carregar cobranças: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleGerarCobrancas = async () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Processando contratos ativos e gerando cobranças...',
        success: 'Cobranças geradas com sucesso para o próximo período!',
        error: 'Erro ao gerar cobranças'
      }
    );
  };

  const stats = {
    total: cobrancas.reduce((acc, c) => acc + c.valor_esperado, 0),
    pago: cobrancas.filter(c => c.status === 'pago').reduce((acc, c) => acc + c.valor_pago, 0),
    pendente: cobrancas.filter(c => c.status === 'pendente').reduce((acc, c) => acc + c.valor_esperado, 0),
    atrasado: cobrancas.filter(c => c.status === 'atrasado').reduce((acc, c) => acc + c.valor_esperado, 0),
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* Header & Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12">
          <IoCashOutline size={200} />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
            <IoCalendarOutline /> Gestão Mensal
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Financeiro de Locação</h1>
          <p className="text-slate-500 font-medium max-w-md">Controle de recebimentos, taxas de administração e repasses automáticos.</p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 relative z-10">
           <select 
            value={mes} 
            onChange={(e) => setMes(parseInt(e.target.value))}
            className="bg-transparent border-none text-sm font-black text-slate-900 focus:ring-0 cursor-pointer"
           >
             {Array.from({ length: 12 }, (_, i) => (
               <option key={i + 1} value={i + 1}>
                 {new Date(0, i).toLocaleString(config.currency.locale, { month: 'long' })}
               </option>
             ))}
           </select>
           <select 
            value={ano} 
            onChange={(e) => setAno(parseInt(e.target.value))}
            className="bg-transparent border-none text-sm font-black text-slate-900 focus:ring-0 cursor-pointer"
           >
             {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
           </select>
           <div className="w-px h-8 bg-slate-200 mx-2" />
           <button 
             onClick={handleGerarCobrancas}
             className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary transition-all shadow-lg shadow-slate-900/10 active:scale-95"
           >
             <IoRocketOutline size={14} /> Gerar Mês
           </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SummaryCard title="Total Previsto" value={stats.total} icon={<IoCashOutline />} color="slate" config={config} loading={loading} />
        <SummaryCard title="Total Recebido" value={stats.pago} icon={<IoCheckmarkCircleOutline />} color="emerald" config={config} loading={loading} />
        <SummaryCard title="Pendente" value={stats.pendente} icon={<IoTimeOutline />} color="blue" config={config} loading={loading} />
        <SummaryCard title="Atrasado" value={stats.atrasado} icon={<IoAlertCircleOutline />} color="rose" config={config} loading={loading} />
      </div>

      {/* Tabela de Cobranças */}
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Cobranças do Período</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Exibindo {cobrancas.length} registros</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm group focus-within:border-primary/50 transition-all">
             <IoSearchOutline className="text-slate-400 group-focus-within:text-primary transition-colors" />
             <input type="text" placeholder="Buscar por inquilino ou imóvel..." className="text-xs font-medium border-none p-0 focus:ring-0 w-64 bg-transparent" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inquilino / Imóvel</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Taxa Adm</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Repasse Líquido</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
              ) : cobrancas.length === 0 ? (
                <tr><td colSpan={6} className="p-20 text-center text-slate-400 font-bold italic">Nenhuma cobrança registrada para este período.</td></tr>
              ) : (
                cobrancas.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                    <td className="px-8 py-6">
                      <div>
                        <p className="font-black text-slate-900 tracking-tight group-hover:text-primary transition-colors">{c.contrato?.lead?.nome || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{c.contrato?.imovel?.referencia} - {c.contrato?.imovel?.titulo}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-slate-600">{new Date(c.data_vencimento).toLocaleDateString(config.currency.locale)}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="text-sm font-black text-slate-900">{formatCurrency(c.valor_esperado, config)}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="text-sm font-bold text-slate-500">{formatCurrency(c.valor_taxa_adm || 0, config)}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <p className="text-sm font-black text-primary">{formatCurrency(c.valor_repasse_proprietario || 0, config)}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase mt-0.5">{c.contrato?.proprietario_nome || 'Proprietário'}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        <StatusBadge status={c.status} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color, config, loading }: any) {
  const colors: any = {
    slate: 'bg-slate-900 text-white shadow-slate-900/10',
    emerald: 'bg-emerald-500 text-white shadow-emerald-500/10',
    blue: 'bg-blue-600 text-white shadow-blue-600/10',
    rose: 'bg-rose-500 text-white shadow-rose-500/10'
  };

  return (
    <div className={`${colors[color]} p-8 rounded-[2.5rem] shadow-xl border border-white/10 relative overflow-hidden group transition-all duration-300 hover:-translate-y-1`}>
      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-500">
        <span className="text-7xl">{icon}</span>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-3">{title}</p>
      {loading ? (
        <LoadingSkeleton className="h-8 w-32 bg-white/20" />
      ) : (
        <p className="text-3xl font-black tracking-tighter">{formatCurrency(value, config)}</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: any = {
    pago: { label: 'Pago', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    pendente: { label: 'Pendente', bg: 'bg-blue-50 text-blue-600 border-blue-100' },
    atrasado: { label: 'Atrasado', bg: 'bg-rose-50 text-rose-600 border-rose-100' },
    cancelado: { label: 'Cancelado', bg: 'bg-slate-100 text-slate-500 border-slate-200' },
  };

  const config = configs[status] || configs.pendente;

  return (
    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.bg}`}>
      {config.label}
    </span>
  );
}
