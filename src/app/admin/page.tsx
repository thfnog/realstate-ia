'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BrokerOnboarding from '@/components/corretores/BrokerOnboarding';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

interface BrokerPerformance {
  id: string;
  nome: string;
  leads: number;
  fechados: number;
  conversao: number;
  comissao: number;
}

interface Stats {
  totalLeads: number;
  leadsNovos: number;
  leadsAtendimento: number;
  leadsFechados: number;
  totalImoveis: number;
  totalCorretores: number;
  leadsHoje: number;
  leadsSemCorretor: number;
  imoveisDisponiveis: number;
  taxaConversao: number;
  totalComissao: number;
  totalVendasValor: number;
  vendasCount: number;
  leadsTemporal: { date: string; count: number }[];
  countsByOrigem: Record<string, number>;
  brokerPerformance: BrokerPerformance[];
}

import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { getConfig, formatCurrency } from '@/lib/countryConfig';

export default function AdminDashboard() {
  const [config, setConfig] = useState<any>(getConfig());
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ app_role: string; email: string; corretor_id: string | null } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [meRes, statsRes, imobRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/stats'),
          fetch('/api/imobiliaria')
        ]);

        const session = await meRes.json();
        setUser(session);

        const statsData = await statsRes.json();
        setStats(statsData);

        const imobData = await imobRes.json();
        if (imobData && imobData.config_pais) {
          const { getConfigByCode } = require('@/lib/countryConfig');
          setConfig(getConfigByCode(imobData.config_pais));
        }
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex flex-col gap-8 animate-fade-in pb-20">
        <div className="space-y-2">
           <LoadingSkeleton className="h-10 w-64" />
           <LoadingSkeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
           {Array.from({ length: 6 }).map((_, idx) => <LoadingSkeleton key={idx} className="h-32 rounded-3xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <LoadingSkeleton className="h-80 rounded-[2.5rem]" />
           <LoadingSkeleton className="h-80 rounded-[2.5rem]" />
        </div>
      </div>
    );
  }

  const { getOrigemLabel } = require('@/lib/countryConfig');
  const leadsPorOrigem = Object.entries(stats.countsByOrigem).map(([origem, count]) => {
    const info = getOrigemLabel(origem);
    return {
      name: info.label,
      value: count as number,
      color: info.color.split(' ')[0],
      icon: info.icon,
    };
  });

  const metricCards = [
    {
      label: 'Comissão Acumulada',
      value: formatCurrency(stats.totalComissao || 0, config),
      icon: '💰',
      color: 'text-primary',
      bg: 'bg-primary/5',
    },
    {
      label: 'Vendas Fechadas',
      value: stats.vendasCount.toString(),
      icon: '🤝',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/50',
    },
    {
      label: 'Leads hoje',
      value: stats.leadsHoje.toString(),
      icon: '⏱️',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50/50',
    },
    {
      label: 'Taxa de Conversão',
      value: `${stats.taxaConversao.toFixed(0)}%`,
      icon: '📈',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/50',
    },
    {
      label: 'Novos (Pendente)',
      value: stats.leadsNovos.toString(),
      icon: '🔔',
      color: 'text-amber-600',
      bg: 'bg-amber-50/50',
    },
    {
      label: 'Total Gerenciado',
      value: stats.totalLeads.toString(),
      icon: '👥',
      color: 'text-slate-600',
      bg: 'bg-slate-50/50',
    },
  ];

  return (
    <div className="animate-fade-in space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
            Olá, <span className="text-gradient">{user?.app_role === 'admin' ? 'Administrador' : 'Consultor'}</span> 👋
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Aqui está o resumo em tempo real da sua operação imobiliária.</p>
        </div>
        <div className="flex gap-3">
           <Link href="/admin/leads" className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200/50 border border-slate-100 hover:bg-slate-50 transition-all active:scale-95">
             Ver Leads
           </Link>
           <Link href="/admin/imoveis/novo" className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-primary transition-all active:scale-95">
             Captar Imóvel
           </Link>
        </div>
      </div>

      {user?.app_role === 'corretor' && user.corretor_id && (
        <BrokerOnboarding brokerId={user.corretor_id} />
      )}

      {/* ===== TOP METRICS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {metricCards.map((card) => (
          <div key={card.label} className={`p-8 rounded-[2rem] border border-slate-100 bg-white shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-1 group relative overflow-hidden`}>
            <div className="absolute -right-2 -bottom-2 text-4xl opacity-[0.03] group-hover:scale-125 transition-transform duration-500">{card.icon}</div>
            <div className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest relative z-10">{card.label}</div>
            <div className={`text-2xl font-black ${card.color} tracking-tighter relative z-10`}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* ===== CHARTS SECTION ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Temporal Growth */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
               <span className="p-2 bg-indigo-50 text-primary rounded-xl">📅</span> Volume Semanal
            </h3>
            <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">Tempo Real</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.leadsTemporal}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Area type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Origin Breakdown */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-10 flex items-center gap-3">
             <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">🌍</span> Canais de Venda
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadsPorOrigem} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{fill: '#64748b', fontSize: 10, fontWeight: 800}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                  {leadsPorOrigem.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#a855f7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ===== BROKER PERFORMANCE (Admins Only) ===== */}
      {user?.app_role === 'admin' && stats.brokerPerformance.length > 0 && (
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between mb-12">
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
               <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">🏆</span> Ranking de Performance
            </h3>
            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-4 py-2 rounded-full uppercase tracking-widest border border-slate-100">
              Métricas Acumuladas
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stats.brokerPerformance.map((broker, idx) => (
              <div key={broker.id} className="relative p-6 rounded-[2rem] border border-slate-100 bg-white hover:shadow-2xl hover:shadow-primary/5 transition-all group border-b-4 border-b-transparent hover:border-b-primary">
                <div className="absolute top-6 right-6 text-[10px] font-black text-slate-200 group-hover:text-primary transition-colors uppercase tracking-widest">
                  Posição #{idx + 1}
                </div>
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20 transform group-hover:rotate-6 transition-transform">
                    {broker.nome.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-lg tracking-tight group-hover:text-primary transition-colors">{broker.nome}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{broker.leads} leads no funil</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Eficiência de Conversão</span>
                    <span className="text-primary">{broker.conversao.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-1000 ease-out" 
                      style={{ width: `${broker.conversao}%` }} 
                    />
                  </div>
                  <div className="flex justify-between mt-6 pt-4 border-t border-slate-50">
                     <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fechamentos</p>
                       <p className="text-lg font-black text-slate-900 tracking-tight">{broker.fechados}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Geração de Receita</p>
                       <p className="text-lg font-black text-emerald-600 tracking-tight">
                         {formatCurrency(broker.comissao, config)}
                       </p>
                     </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== QUICK ACCESS & STATUS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10">
        <div className="md:col-span-2 bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden group shadow-2xl shadow-slate-900/20">
          <div className="relative z-10 flex flex-col h-full justify-center">
            <h2 className="text-3xl font-black mb-4 tracking-tighter">Escalabilidade & Performance 🚀</h2>
            <p className="text-slate-400 mb-10 max-w-md font-medium">Acelere sua imobiliária com inteligência artificial, automação de leads e gestão financeira integrada.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/admin/imoveis" className="px-8 py-3 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl shadow-white/5 active:scale-95">
                Novo Imóvel
              </Link>
              {user?.app_role === 'admin' && (
                <Link href="/admin/corretores" className="px-8 py-3 bg-slate-800 text-white border border-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95">
                  Gerir Equipe
                </Link>
              )}
            </div>
          </div>
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/20 rounded-full blur-[80px] group-hover:bg-primary/40 transition-all duration-700" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" />
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
           <div>
             <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Saúde do Inventário</h3>
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carteira Ativa</span>
                   <span className="font-black text-slate-900 text-lg">{stats.totalImoveis}</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                   <div className="bg-emerald-500 h-full transition-all duration-1000" style={{width: `${(stats.imoveisDisponiveis / (stats.totalImoveis || 1)) * 100}%`}} />
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disponibilidade</span>
                   <span className="font-black text-emerald-600 text-lg">
                    {((stats.imoveisDisponiveis / (stats.totalImoveis || 1)) * 100).toFixed(0)}%
                   </span>
                </div>
             </div>
           </div>
           <Link href="/admin/agenda" className="mt-8 block text-center py-4 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 rounded-2xl hover:bg-primary hover:text-white transition-all">
             Ver Escala de Plantão →
           </Link>
        </div>
      </div>
    </div>
  );
}
