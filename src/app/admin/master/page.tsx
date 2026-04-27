'use client';

import Link from 'next/link';
import { 
  IoBusinessOutline, 
  IoDiamondOutline, 
  IoTrendingUpOutline, 
  IoPulseOutline,
  IoStatsChartOutline,
  IoSettingsOutline,
  IoArrowForwardOutline,
  IoCashOutline,
  IoPeopleOutline
} from 'react-icons/io5';

export default function MasterDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/master/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const masterModules = [
    {
      title: 'Imobiliárias & Clientes',
      description: 'Gestão de contas, ativação de planos e suporte técnico aos inquilinos.',
      icon: <IoBusinessOutline size={32} />,
      href: '/admin/master/imobiliarias',
      color: 'bg-indigo-500',
      stats: loading ? '...' : `${stats?.agenciesCount || 0} Ativas`
    },
    {
      title: 'Planos & Módulos',
      description: 'Configuração de preços, limites e funcionalidades de cada nível de assinatura.',
      icon: <IoDiamondOutline size={32} />,
      href: '/admin/master/planos',
      color: 'bg-amber-500',
      stats: '3 Planos'
    },
    {
      title: 'Receita & Financeiro',
      description: 'Dashboard financeiro global, controle de faturas e inadimplência.',
      icon: <IoCashOutline size={32} />,
      href: '/admin/master/financeiro',
      color: 'bg-emerald-500',
      stats: loading ? '...' : `R$ ${(stats?.monthlyRevenue || 0).toLocaleString('pt-BR')}/mês`
    },
    {
      title: 'Performance do Sistema',
      description: 'Monitoramento de APIs, Webhooks e integridade dos serviços de IA.',
      icon: <IoPulseOutline size={32} />,
      href: '/admin/master/status',
      color: 'bg-rose-500',
      stats: '99.9% Uptime'
    }
  ];

  return (
    <div className="animate-fade-in space-y-12 pb-20">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl shadow-slate-900/40">
        <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
          <IoStatsChartOutline size={280} />
        </div>
        
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Master Control Center
          </div>
          
          <div className="max-w-2xl">
            <h1 className="text-5xl font-black tracking-tighter mb-4 leading-tight">
              Olá, <span className="text-primary-light">Master Admin</span>.
            </h1>
            <p className="text-xl text-slate-400 font-medium leading-relaxed">
              Bem-vindo ao centro de comando da ImobIA. Aqui você controla a infraestrutura SaaS, monitora o crescimento e gerencia as assinaturas globais.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Receita Anual</p>
              <p className="text-2xl font-black tracking-tighter text-emerald-400">
                {loading ? '...' : `R$ ${(stats?.annualRevenue || 0).toLocaleString('pt-BR')}`}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Leads IA</p>
              <p className="text-2xl font-black tracking-tighter text-indigo-400">
                {loading ? '...' : (stats?.leadsCount > 1000 ? `${(stats.leadsCount / 1000).toFixed(1)}k` : stats?.leadsCount)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Novas Contas</p>
              <p className="text-2xl font-black tracking-tighter text-primary-light">
                {loading ? '...' : `+${stats?.newAgenciesCount || 0} este mês`}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Conversão Global</p>
              <p className="text-2xl font-black tracking-tighter text-amber-400">
                {loading ? '...' : `${stats?.globalConversion || 0}%`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {masterModules.map((module, idx) => (
          <Link 
            key={idx} 
            href={module.href}
            className="group relative bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300/60 transition-all duration-500 hover:-translate-y-2 flex flex-col justify-between overflow-hidden"
          >
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 ${module.color} opacity-0 group-hover:opacity-10 rounded-bl-[4rem] transition-all duration-500`} />

            <div className="space-y-6 relative z-10">
              <div className={`w-16 h-16 ${module.color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-current/20 group-hover:scale-110 transition-transform duration-500`}>
                {module.icon}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{module.title}</h2>
                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-slate-50 text-slate-500 rounded-full border border-slate-100">
                    {module.stats}
                  </span>
                </div>
                <p className="text-slate-500 font-medium leading-relaxed">
                  {module.description}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between group-hover:border-primary/20 transition-colors relative z-10">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors">Acessar Módulo</span>
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                <IoArrowForwardOutline size={20} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions / Recent Activity Placeholder */}
      <div className="bg-slate-50/50 rounded-[3rem] p-12 border border-slate-100 text-center space-y-6">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl text-slate-300">
          <IoTrendingUpOutline size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Atividade Global em Tempo Real</h3>
          <p className="text-slate-500 max-w-md mx-auto font-medium">Os logs de atividade de todas as instâncias aparecerão aqui para auditoria e monitoramento proativo.</p>
        </div>
      </div>
    </div>
  );
}
