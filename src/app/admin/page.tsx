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
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';

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
  leadsPorOrigem: { name: string; value: number; color: string; icon: string }[];
  leadsTemporal: { date: string; count: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    leadsNovos: 0,
    leadsAtendimento: 0,
    leadsFechados: 0,
    totalImoveis: 0,
    totalCorretores: 0,
    leadsHoje: 0,
    leadsSemCorretor: 0,
    imoveisDisponiveis: 0,
    taxaConversao: 0,
    leadsPorOrigem: [],
    leadsTemporal: [],
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ role: string; corretor_id: string | null } | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [meRes, leadsRes, imoveisRes, corretoresRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/leads?limit=1000'), // Get more for temporal analysis
          fetch('/api/imoveis'),
          fetch('/api/corretores'),
        ]);

        const session = await meRes.json();
        setUser(session);

        const leadsData = await leadsRes.json();
        const imoveis = await imoveisRes.json();
        const corretores = await corretoresRes.json();

        let leads = leadsData.data || [];

        // Apply Role Filter
        if (session.role === 'corretor' && session.corretor_id) {
          leads = leads.filter((l: any) => l.corretor_id === session.corretor_id);
        }

        const today = new Date().toISOString().split('T')[0];
        const leadsHoje = leads.filter((l: { criado_em: string }) => l.criado_em.startsWith(today)).length;
        const leadsSemCorretor = leads.filter((l: { corretor_id: string | null }) => !l.corretor_id).length;
        const fechados = leads.filter((l: { status: string }) => l.status === 'fechado').length;

        // Month scope for conversion
        const thisMonth = new Date().toISOString().slice(0, 7);
        const leadsDoMes = leads.filter((l: { criado_em: string }) => l.criado_em.startsWith(thisMonth));
        const fechadosDoMes = leadsDoMes.filter((l: { status: string }) => l.status === 'fechado').length;
        const taxaConversao = leadsDoMes.length > 0 ? (fechadosDoMes / leadsDoMes.length) * 100 : 0;

        const disponiveisCount = Array.isArray(imoveis)
          ? imoveis.filter((i: { status: string }) => i.status === 'disponivel').length
          : 0;

        // Origin Data for Chart
        const { getOrigemLabel } = require('@/lib/countryConfig');
        const countsByOrigem = leads.reduce((acc: Record<string, number>, l: { origem: string }) => {
          const o = l.origem || 'desconhecido';
          acc[o] = (acc[o] || 0) + 1;
          return acc;
        }, {});

        const leadsPorOrigem = Object.entries(countsByOrigem).map(([origem, count]) => {
          const info = getOrigemLabel(origem);
          return {
            name: info.label,
            value: count as number,
            color: info.color.split(' ')[0], // Base color class
            icon: info.icon,
          };
        });

        // Temporal Data (Last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
        }).reverse();

        const leadsTemporal = last7Days.map(date => ({
          date: date.split('-').slice(1, 3).reverse().join('/'), // DD/MM
          count: leads.filter((l: any) => l.criado_em.startsWith(date)).length,
        }));

        setStats({
          totalLeads: leads.length,
          leadsNovos: leads.filter((l: { status: string }) => l.status === 'novo').length,
          leadsAtendimento: leads.filter((l: { status: string }) => l.status === 'em_atendimento').length,
          leadsFechados: fechados,
          totalImoveis: Array.isArray(imoveis) ? imoveis.length : 0,
          totalCorretores: Array.isArray(corretores) ? corretores.length : 0,
          leadsHoje,
          leadsSemCorretor,
          imoveisDisponiveis: disponiveisCount,
          taxaConversao,
          leadsPorOrigem,
          leadsTemporal,
        });
      } catch (err) {
        console.error('Erro ao carregar stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

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
            Olá, {user?.role === 'admin' ? 'Administrador' : 'Consultor'} 👋
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
              {loading ? <div className="h-9 w-16 bg-slate-200 animate-pulse rounded" /> : card.value}
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
              <BarChart data={stats.leadsPorOrigem} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{fill: '#475569', fontSize: 12, fontWeight: 500}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {stats.leadsPorOrigem.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#8b5cf6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ===== QUICK ACCESS & STATUS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Pronto para acelerar? 🚀</h2>
            <p className="text-slate-400 mb-6 max-w-md">Gerencie seus imóveis e corretores com facilidade ou acompanhe sua escala de plantão.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/imoveis" className="px-5 py-2.5 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-all">
                Novo Imóvel
              </Link>
              {user?.role === 'admin' && (
                <Link href="/admin/corretores" className="px-5 py-2.5 bg-slate-800 text-white border border-slate-700 rounded-xl font-bold hover:bg-slate-700 transition-all">
                  Gerir Equipe
                </Link>
              )}
            </div>
          </div>
          {/* Abstract blobs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
           <h3 className="text-lg font-bold text-slate-800 mb-4">Status da Equipe</h3>
           <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <span className="text-sm text-slate-500">Imóveis Ativos</span>
                 <span className="font-bold text-slate-800">{stats.totalImoveis}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                 <div className="bg-emerald-500 h-full" style={{width: `${(stats.imoveisDisponiveis / (stats.totalImoveis || 1)) * 100}%`}} />
              </div>
              <div className="flex items-center justify-between">
                 <span className="text-sm text-slate-500">Plantão Hoje</span>
                 <span className="font-bold text-slate-800">{stats.totalCorretores > 0 ? 'Ativo' : 'Pendente'}</span>
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
