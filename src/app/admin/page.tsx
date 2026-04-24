'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  leadsTemporal: { date: string; count: number }[];
  countsByOrigem: Record<string, number>;
  brokerPerformance: BrokerPerformance[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ app_role: string; email: string } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [meRes, statsRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/stats'),
        ]);

        const session = await meRes.json();
        setUser(session);

        const statsData = await statsRes.json();
        setStats(statsData);
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
      <div className="flex flex-col gap-8 animate-pulse p-4">
        <div className="h-20 w-1/3 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="h-64 bg-slate-100 rounded-2xl" />
           <div className="h-64 bg-slate-100 rounded-2xl" />
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
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Olá, {user?.app_role === 'admin' ? 'Administrador' : 'Consultor'} 👋
          </h1>
          <p className="text-slate-500 mt-1">Aqui está o resumo da sua performance.</p>
        </div>
        <div className="flex gap-2">
           <Link href="/admin/leads" className="px-4 py-2 bg-primary text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all">
             Ver Leads
           </Link>
        </div>
      </div>

      {/* ===== TOP METRICS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <div key={card.label} className={`p-6 rounded-2xl border border-slate-100 ${card.bg} transition-all hover:shadow-sm`}>
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-sm font-medium text-slate-500 mb-1">{card.label}</div>
            <div className={`text-3xl font-bold ${card.color}`}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* ===== CHARTS SECTION ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Temporal Growth */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
             📅 Volume Semanal de Leads
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.leadsTemporal}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Origin Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
             🌍 Fontes de Aquisição
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadsPorOrigem} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{fill: '#475569', fontSize: 12, fontWeight: 500}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {leadsPorOrigem.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#8b5cf6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ===== BROKER PERFORMANCE (Admins Only) ===== */}
      {user?.app_role === 'admin' && stats.brokerPerformance.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               🏆 Performance por Consultor
            </h3>
            <span className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
              Ranking de Conversão
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.brokerPerformance.map((broker, idx) => (
              <div key={broker.id} className="relative p-5 rounded-2xl border border-slate-100 bg-white hover:shadow-md transition-all group">
                <div className="absolute top-4 right-4 text-xs font-black text-slate-200 group-hover:text-primary/10 transition-colors">
                  #{idx + 1}
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-primary font-bold text-lg">
                    {broker.nome.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{broker.nome}</h4>
                    <p className="text-xs text-slate-500">{broker.leads} leads gerenciados</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">Conversão</span>
                    <span className="text-primary">{broker.conversao.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-1000" 
                      style={{ width: `${broker.conversao}%` }} 
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 text-right">
                    {broker.fechados} vendas realizadas
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== QUICK ACCESS & STATUS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-10">
        <div className="md:col-span-2 bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Pronto para acelerar? 🚀</h2>
            <p className="text-slate-400 mb-6 max-w-md">Gerencie seus imóveis e corretores com facilidade ou acompanhe sua escala de plantão.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/imoveis" className="px-5 py-2.5 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-all">
                Novo Imóvel
              </Link>
              {user?.app_role === 'admin' && (
                <Link href="/admin/corretores" className="px-5 py-2.5 bg-slate-800 text-white border border-slate-700 rounded-xl font-bold hover:bg-slate-700 transition-all">
                  Gerir Equipe
                </Link>
              )}
            </div>
          </div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
           <h3 className="text-lg font-bold text-slate-800 mb-4">Status do Inventário</h3>
           <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <span className="text-sm text-slate-500">Imóveis Ativos</span>
                 <span className="font-bold text-slate-800">{stats.totalImoveis}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                 <div className="bg-emerald-500 h-full" style={{width: `${(stats.imoveisDisponiveis / (stats.totalImoveis || 1)) * 100}%`}} />
              </div>
              <div className="flex items-center justify-between">
                 <span className="text-sm text-slate-500">Disponíveis</span>
                 <span className="font-bold text-slate-800">{stats.imoveisDisponiveis}</span>
              </div>
              <Link href="/admin/agenda" className="block text-center py-2 text-sm text-primary font-bold hover:underline">
                Ver Escala Completa →
              </Link>
           </div>
        </div>
      </div>
    </div>
  );
}
