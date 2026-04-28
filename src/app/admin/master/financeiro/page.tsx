'use client';

import Link from 'next/link';
import { IoStatsChartOutline, IoWalletOutline, IoTrendingUpOutline, IoPeopleOutline, IoTimeOutline, IoCheckmarkCircleOutline, IoArrowBackOutline } from 'react-icons/io5';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

export default function MasterFinanceiroPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/master/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return <div className="p-10"><LoadingSkeleton className="h-96 rounded-3xl" /></div>;
  }

  const kpis = [
    { label: 'MRR Global', value: `R$ ${(stats.monthlyRevenue || 0).toLocaleString('pt-BR')}`, icon: <IoWalletOutline />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Imobiliárias Ativas', value: stats.agenciesCount, icon: <IoPeopleOutline />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Crescimento MoM', value: `+${stats.growth || 0}%`, icon: <IoTrendingUpOutline />, color: 'text-primary', bg: 'bg-primary/5' },
    { label: 'Faturas Pendentes', value: stats.pendingInvoices || 0, icon: <IoTimeOutline />, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="animate-fade-in space-y-10 pb-20">
      <Link 
        href="/admin/master" 
        className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-all font-black text-[10px] uppercase tracking-widest group"
      >
        <IoArrowBackOutline className="group-hover:-translate-x-1 transition-transform" size={16} />
        Voltar ao Painel Master
      </Link>

      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Receita Global</h1>
        <p className="text-slate-500 font-medium">Visão executiva do faturamento e saúde financeira do SaaS.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
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
            {stats.planDistribution?.map((plan: any, i: number) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-end">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">{plan.label}</p>
                  <p className="text-sm font-black text-slate-900">{plan.count} <span className="text-slate-300 text-[10px]">({plan.percentage}%)</span></p>
                </div>
                <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${plan.label === 'Enterprise' ? 'bg-slate-900' : plan.label === 'Profissional' ? 'bg-primary' : 'bg-slate-300'}`} 
                    style={{ width: `${plan.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {(!stats.planDistribution || stats.planDistribution.length === 0) && (
              <p className="text-xs text-slate-400 italic">Nenhuma assinatura ativa encontrada.</p>
            )}
          </div>
        </div>

        {/* Global Payments Stream */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Últimos Recebimentos</h3>
            <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Ver tudo</button>
          </div>
          <div className="space-y-6">
            {stats.recentPayments?.map((pay: any, i: number) => (
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
                  <p className="text-sm font-black text-emerald-600">R$ {Number(pay.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">{pay.date}</p>
                </div>
              </div>
            ))}
            {(!stats.recentPayments || stats.recentPayments.length === 0) && (
              <div className="text-center py-10">
                <p className="text-slate-400 text-sm italic">Nenhum pagamento registrado recentemente.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
