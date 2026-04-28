import React from 'react';
import type { Corretor } from '@/lib/database.types';

interface LeadsHeaderProps {
  viewMode: 'kanban' | 'table';
  setViewMode: (mode: 'kanban' | 'table') => void;
  leadsCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  corretorFilter: string;
  setCorretorFilter: (f: string) => void;
  origemFilter: string;
  setOrigemFilter: (f: string) => void;
  statusFilter: string;
  setStatusFilter: (f: string) => void;
  finalidadeFilter: string;
  setFinalidadeFilter: (f: string) => void;
  sortOrder: 'novo' | 'antigo' | 'interesse';
  setSortOrder: (s: 'novo' | 'antigo' | 'interesse') => void;
  corretores: Corretor[];
  onAddLead: () => void;
}

export function LeadsHeader({
  viewMode,
  setViewMode,
  leadsCount,
  searchQuery,
  setSearchQuery,
  corretorFilter,
  setCorretorFilter,
  origemFilter,
  setOrigemFilter,
  statusFilter,
  setStatusFilter,
  finalidadeFilter,
  setFinalidadeFilter,
  sortOrder,
  setSortOrder,
  corretores,
  onAddLead
}: LeadsHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Funil de Vendas</h1>
        <p className="text-text-secondary text-sm mt-1">
          {viewMode === 'kanban' ? 'Visão por estágios' : 'Visão em lista'} • {leadsCount} lead(s)
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        {/* Search Input */}
        <div className="relative flex-1 sm:min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">🔍</span>
          <input 
            type="text"
            placeholder="Buscar por nome ou tel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-white text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Sorting */}
        <div className="flex items-center gap-1 bg-surface-alt p-1 rounded-xl border border-border-light shadow-inner">
           <button 
             onClick={() => setSortOrder('novo')}
             className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sortOrder === 'novo' ? 'bg-white text-primary shadow-sm' : 'text-text-muted'}`}
             title="Mais recentes primeiro"
           >
             ↓ Novo
           </button>
           <button 
             onClick={() => setSortOrder('antigo')}
             className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sortOrder === 'antigo' ? 'bg-white text-primary shadow-sm' : 'text-text-muted'}`}
             title="Mais antigos primeiro"
           >
             ↑ Antigo
           </button>
           <button 
             onClick={() => setSortOrder('interesse')}
             className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sortOrder === 'interesse' ? 'bg-white text-primary shadow-sm' : 'text-text-muted'}`}
             title="Agrupar por interesse"
           >
             🎯 Interesse
           </button>
        </div>

        {/* Toggle View Mode */}
        <div className="flex bg-surface-alt p-1 rounded-xl border border-border-light shadow-inner w-full sm:w-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            📋 Tabela
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'kanban' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            📊 Funil
          </button>
        </div>

        <button 
          onClick={onAddLead}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-lg shadow-slate-200"
        >
          <span>➕</span> Novo Lead
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={finalidadeFilter}
            onChange={(e) => setFinalidadeFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-lg border border-border bg-white text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Todos Interesses</option>
            <option value="alugar">Aluguel</option>
            <option value="comprar">Compra</option>
            <option value="investir">Investimento / Venda</option>
          </select>

          <select
            value={corretorFilter}
            onChange={(e) => setCorretorFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-lg border border-border bg-white text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Todos consultores</option>
            {corretores.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          <select
            value={origemFilter}
            onChange={(e) => setOrigemFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-lg border border-border bg-white text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Todas origens</option>
            <option value="formulario">Formulário</option>
            <option value="email_ego">E-mail eGO</option>
            <option value="webhook_grupozap">Grupo OLX</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="manual">Manual</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-lg border border-border bg-white text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Todos os status</option>
            <option value="novo">Novos</option>
            <option value="em_atendimento">Em atendimento</option>
            <option value="visita_agendada">Visita agendada</option>
            <option value="negociacao">Negociação</option>
            <option value="contrato">Em Contrato</option>
            <option value="fechado">Fechados</option>
            <option value="sem_interesse">Sem interesse</option>
            <option value="descartado">Descartados</option>
          </select>
        </div>
      </div>
    </div>
  );
}
