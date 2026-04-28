'use client';

import { useEffect, useState } from 'react';
import type { LeadComCorretor } from '@/lib/database.types';
import { PlanGuard } from '@/components/PlanGuard';

export default function CarteiraPage() {
  const [leads, setLeads] = useState<LeadComCorretor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await fetch('/api/leads');
        const data = await res.json();
        if (Array.isArray(data)) {
          // Only show leads that have an assigned broker (attended leads)
          setLeads(data.filter((l: LeadComCorretor) => l.corretor_id));
        }
      } catch (err) {
        console.error('Erro:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, []);

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.nome.toLowerCase().includes(s) ||
      l.telefone.includes(s) ||
      l.corretores?.nome.toLowerCase().includes(s)
    );
  });

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  return (
    <PlanGuard requiredModule="operacao">
      <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Carteira de Clientes</h1>
          <p className="text-text-secondary text-sm mt-1">{filtered.length} cliente(s) com corretor atribuído</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, telefone ou corretor..."
          className="w-full max-w-md px-4 py-2.5 rounded-xl border border-border bg-white text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-border-light p-5 animate-pulse">
          <div className="h-4 w-40 bg-surface-alt rounded mb-3" />
          <div className="h-3 w-64 bg-surface-alt rounded mb-2" />
          <div className="h-3 w-48 bg-surface-alt rounded" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-light p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-text-secondary">
            {search ? 'Nenhum resultado encontrado' : 'Nenhum cliente na carteira ainda'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light bg-surface-alt/50">
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Telefone</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Corretor Responsável</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Data de Entrada</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b border-border-light last:border-0 hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">{lead.nome}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      <a
                        href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {lead.telefone}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
                          {lead.corretores?.nome?.charAt(0) || '?'}
                        </span>
                        {lead.corretores?.nome || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        lead.status === 'fechado'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : lead.status === 'em_atendimento'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {lead.status === 'em_atendimento' ? 'Em atendimento' : lead.status === 'fechado' ? 'Fechado' : 'Novo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(lead.criado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </PlanGuard>
  );
}
