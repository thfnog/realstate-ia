'use client';

import { useState, useEffect } from 'react';
import { IoStatsChartOutline, IoWalletOutline, IoTrendingUpOutline, IoPeopleOutline, IoTimeOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

export default function MasterFinanceiroPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    mrr: 15450,
    activeTenants: 42,
    growth: 12.5,
    pendingInvoices: 8,
  });

  useEffect(() => {
    // Mocking global revenue data
    setTimeout(() => setLoading(false), 800);
  }, []);

  return (
    <div className="animate-fade-in space-y-10 pb-20">
      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Receita Global</h1>
        <p className="text-slate-500 font-medium">Visão executiva do faturamento e saúde financeira do SaaS.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'MRR Global', value: `R$ ${stats.mrr.toLocaleString('pt-BR')}`, icon: <IoWalletOutline />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Imobiliárias Ativas', value: stats.activeTenants, icon: <IoPeopleOutline />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Crescimento MoM', value: `+${stats.growth}%`, icon: <IoTrendingUpOutline />, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'Faturas Pendentes', value: stats.pendingInvoices, icon: <IoTimeOutline />, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:scale-[1.02] transition-all">
            <div className={`w-12 h-12 ${kpi.bg} ${kpi.color} rounded-2xl flex items-center justify-center mb-6`}>
              {kpi.icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{kpi.label}</p>
            <p className={`text-2xl font-black ${kpi.color} tracking-tight`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Plan Distribution */}
        <div className="lg:col-span-1 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50">
          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Distribuição por Plano</h3>
          <div className="space-y-6">
            {[
              { label: 'Enterprise', count: 8, color: 'bg-slate-900', percentage: 19 },
              { label: 'Profissional', count: 24, color: 'bg-primary', percentage: 57 },
              { label: 'Essencial', count: 10, color: 'bg-slate-300', percentage: 24 },
            ].map((plan, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-end">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">{plan.label}</p>
                  <p className="text-sm font-black text-slate-900">{plan.count} <span className="text-slate-300 text-[10px]">({plan.percentage}%)</span></p>
                </div>
                <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                  <div className={`h-full ${plan.color} rounded-full`} style={{ width: `${plan.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Payments Stream */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Últimos Recebimentos</h3>
            <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Ver tudo</button>
          </div>
          <div className="space-y-6">
            {loading ? <LoadingSkeleton className="h-64 rounded-3xl" /> : (
              [
                { company: 'Imobiliária Silva & Co', plan: 'Enterprise', value: 999.00, date: 'Hoje, 14:20' },
                { company: 'Prime Real Estate', plan: 'Profissional', value: 499.00, date: 'Hoje, 11:05' },
                { company: 'Portugal Homes', plan: 'Profissional', value: 499.00, date: 'Ontem, 18:30' },
                { company: 'Vila Real Imóveis', plan: 'Essencial', value: 199.00, date: 'Ontem, 09:15' },
              ].map((pay, i) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <IoCheckmarkCircleOutline size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 tracking-tight">{pay.company}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pay.plan}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-600">R$ {pay.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">{pay.date}</p>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
