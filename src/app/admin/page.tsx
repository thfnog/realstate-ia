'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  totalLeads: number;
  leadsNovos: number;
  leadsAtendimento: number;
  leadsFechados: number;
  totalImoveis: number;
  totalCorretores: number;
  // New metrics
  leadsHoje: number;
  leadsSemCorretor: number;
  imoveisDisponiveis: number;
  taxaConversao: number;
  leadsPorOrigem: Record<string, number>;
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
    leadsPorOrigem: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [leadsRes, imoveisRes, corretoresRes] = await Promise.all([
          fetch('/api/leads'),
          fetch('/api/imoveis'),
          fetch('/api/corretores'),
        ]);

        const leads = await leadsRes.json();
        const imoveis = await imoveisRes.json();
        const corretores = await corretoresRes.json();

        if (Array.isArray(leads)) {
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

          const leadsPorOrigem = leads.reduce((acc: Record<string, number>, l: { origem: string }) => {
            const o = l.origem || 'desconhecido';
            acc[o] = (acc[o] || 0) + 1;
            return acc;
          }, {});

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
          });
        }
      } catch (err) {
        console.error('Erro ao carregar stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Top-level metric cards (the 4 requested ones)
  const metricCards = [
    {
      label: 'Leads hoje',
      value: stats.leadsHoje.toString(),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
    },
    {
      label: 'Sem corretor',
      value: stats.leadsSemCorretor.toString(),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: stats.leadsSemCorretor > 0 ? 'text-red-600' : 'text-emerald-600',
      bg: stats.leadsSemCorretor > 0 ? 'bg-red-50' : 'bg-emerald-50',
      border: stats.leadsSemCorretor > 0 ? 'border-red-200' : 'border-emerald-100',
      alert: stats.leadsSemCorretor > 0,
    },
    {
      label: 'Imóveis disponíveis',
      value: stats.imoveisDisponiveis.toString(),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
    },
    {
      label: 'Conversão do mês',
      value: `${stats.taxaConversao.toFixed(0)}%`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
  ];

  const statusCards = [
    { label: 'Leads Novos', value: stats.leadsNovos, color: 'bg-primary', icon: '🔔', href: '/admin/leads' },
    { label: 'Em Atendimento', value: stats.leadsAtendimento, color: 'bg-warning', icon: '⏳', href: '/admin/leads' },
    { label: 'Fechados', value: stats.leadsFechados, color: 'bg-success', icon: '✅', href: '/admin/leads' },
    { label: 'Total Leads', value: stats.totalLeads, color: 'bg-secondary', icon: '👤', href: '/admin/leads' },
    { label: 'Imóveis', value: stats.totalImoveis, color: 'bg-purple-500', icon: '🏠', href: '/admin/imoveis' },
    { label: 'Corretores', value: stats.totalCorretores, color: 'bg-pink-500', icon: '🤝', href: '/admin/corretores' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">Visão geral da imobiliária</p>
        </div>
      </div>

      {/* ===== TOP METRICS BAR ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-4 ${card.bg} ${card.border} ${card.alert ? 'animate-pulse' : ''}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={card.color}>{card.icon}</span>
              <span className="text-xs font-medium text-text-secondary">{card.label}</span>
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>
              {loading ? <div className="h-7 w-10 rounded bg-white/50 animate-pulse" /> : card.value}
            </div>
          </div>
        ))}
      </div>

      {/* ===== STATUS CARDS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statusCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group bg-white rounded-xl border border-border-light p-5 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`w-10 h-10 flex items-center justify-center rounded-lg ${card.color} text-white text-lg`}>
                {card.icon}
              </span>
              <svg className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-text-primary">
              {loading ? (
                <div className="h-8 w-12 rounded bg-surface-alt animate-pulse" />
              ) : (
                card.value
              )}
            </div>
            <div className="text-sm text-text-secondary mt-1">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* ===== LEADS POR CANAL ===== */}
      <div className="mt-8 bg-white rounded-xl border border-border-light p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Leads por Canal</h2>
        <div className="flex flex-wrap gap-4">
          {Object.entries(stats.leadsPorOrigem).map(([origem, count]) => {
            const { getOrigemLabel } = require('@/lib/countryConfig');
            const info = getOrigemLabel(origem);
            return (
              <div key={origem} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${info.color} bg-opacity-30`}>
                <span className="text-2xl">{info.icon}</span>
                <div>
                  <div className="text-sm font-medium">{info.label}</div>
                  <div className="text-xl font-bold">{count}</div>
                </div>
              </div>
            );
          })}
          {Object.keys(stats.leadsPorOrigem).length === 0 && !loading && (
             <p className="text-text-muted text-sm text-center w-full py-4">Nenhum dado disponível.</p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8 bg-white rounded-xl border border-border-light p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Ações rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/imoveis"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-subtle text-primary font-medium text-sm hover:bg-primary hover:text-white transition-all"
          >
            ➕ Novo imóvel
          </Link>
          <Link
            href="/admin/corretores"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-subtle text-primary font-medium text-sm hover:bg-primary hover:text-white transition-all"
          >
            ➕ Novo corretor
          </Link>
          <Link
            href="/admin/escala"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-subtle text-primary font-medium text-sm hover:bg-primary hover:text-white transition-all"
          >
            📅 Gerenciar escala
          </Link>
          <Link
            href="/formulario"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-alt text-text-secondary font-medium text-sm hover:bg-surface-hover transition-all"
          >
            🔗 Ver formulário público
          </Link>
        </div>
      </div>
    </div>
  );
}
