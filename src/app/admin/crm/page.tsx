'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  IoSearchOutline, IoPeopleOutline, IoPersonOutline, 
  IoEyeOutline, IoRefreshOutline, IoFunnelOutline,
  IoLogoWhatsapp, IoMailOutline, IoCalendarOutline
} from 'react-icons/io5';
import type { LeadComCorretor, StatusLead, Corretor } from '@/lib/database.types';
import { ClienteDetailDrawer } from '@/components/crm/ClienteDetailDrawer';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

const statusConfig: Record<StatusLead, { label: string; color: string; bg: string }> = {
  novo: { label: 'Novo', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  em_atendimento: { label: 'Em atendimento', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  visita_agendada: { label: 'Visita agendada', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  negociacao: { label: 'Negociação', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  contrato: { label: 'Em Contrato', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
  fechado: { label: 'Fechado 🎉', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  sem_interesse: { label: 'Sem interesse', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
  descartado: { label: 'Descartado 🗑️', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
};

const classificationConfig: Record<string, { label: string; color: string; bg: string }> = {
  comprador: { label: '🛒 Comprador', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  vendedor: { label: '🔑 Vendedor', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  locatario: { label: '🏠 Locatário', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  investidor: { label: '📈 Investidor', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  corretor_parceiro: { label: '🤝 Parceiro', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  proprietario: { label: '💼 Proprietário', color: 'text-slate-700', bg: 'bg-slate-100 border-slate-300' },
  curioso: { label: '🕵️ Curioso', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  indefinido: { label: '❓ Indefinido', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' }
};

interface GroupFilterItem {
  grupo_jid: string;
  grupo_nome: string;
}

export default function CRMClientesPage() {
  const [clientes, setClientes] = useState<LeadComCorretor[]>([]);
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [grupos, setGrupos] = useState<GroupFilterItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [corretorFilter, setCorretorFilter] = useState('');
  const [grupoFilter, setGrupoFilter] = useState('');
  const [classificacaoFilter, setClassificacaoFilter] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // Selected client for Drawer
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL('/api/clientes', window.location.origin);
      if (search) url.searchParams.set('search', search);
      if (statusFilter) url.searchParams.set('status', statusFilter);
      if (corretorFilter) url.searchParams.set('corretor_id', corretorFilter);
      if (grupoFilter) url.searchParams.set('grupo_jid', grupoFilter);
      if (classificacaoFilter) url.searchParams.set('classificacao', classificacaoFilter);
      
      url.searchParams.set('page', page.toString());
      url.searchParams.set('limit', limit.toString());

      const res = await fetch(url.toString());
      if (res.ok) {
        const result = await res.json();
        setClientes(result.data || []);
        setTotalCount(result.count || 0);
      } else {
        toast.error('Erro ao buscar clientes');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar lista de clientes');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, corretorFilter, grupoFilter, classificacaoFilter, page]);

  const fetchFiltersData = useCallback(async () => {
    try {
      const [resCorretores, resGrupos] = await Promise.all([
        fetch('/api/corretores'),
        fetch('/api/leads/grupos')
      ]);

      if (resCorretores.ok) {
        const corrData = await resCorretores.json();
        if (Array.isArray(corrData)) {
          setCorretores(corrData.filter(c => c.ativo));
        }
      }

      if (resGrupos.ok) {
        const groupData = await resGrupos.json();
        if (Array.isArray(groupData)) {
          setGrupos(groupData);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados auxiliares de filtros:', err);
    }
  }, []);

  useEffect(() => {
    fetchFiltersData();
  }, [fetchFiltersData]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, corretorFilter, grupoFilter, classificacaoFilter]);

  async function handleQuickUpdateCorretor(id: string, novoCorretorId: string) {
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corretor_id: novoCorretorId || null })
      });

      if (res.ok) {
        toast.success('Consultor responsável atualizado!');
        fetchClientes();
      } else {
        toast.error('Erro ao atualizar consultor');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao atualizar consultor');
    }
  }

  async function handleQuickUpdateStatus(id: string, novoStatus: StatusLead) {
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });

      if (res.ok) {
        toast.success('Status do atendimento atualizado!');
        fetchClientes();
      } else {
        toast.error('Erro ao atualizar status');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao atualizar status');
    }
  }

  const formatDistanceTime = (dateStr: string) => {
    if (!dateStr) return 'Sem registro';
    const distance = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(distance / (60 * 1000));
    const hours = Math.floor(distance / (60 * 60 * 1000));
    const days = Math.floor(distance / (24 * 60 * 60 * 1000));

    if (mins < 60) return `Há ${mins} min`;
    if (hours < 24) return `Há ${hours} h`;
    return `Há ${days} dias`;
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="animate-fade-in space-y-6 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            👤 Gestão de Clientes (CRM)
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
            Acompanhe a ficha, histórico, WhatsApp e matches de leads qualificados.
          </p>
        </div>
        <button 
          onClick={fetchClientes}
          className="self-start flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 text-slate-600 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-50 transition-all"
        >
          <IoRefreshOutline size={16} />
          Atualizar
        </button>
      </div>

      {/* Advanced Filter Panel */}
      <div className="bg-white/70 backdrop-blur-md border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/40 space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-widest border-b border-slate-50 pb-2 mb-2">
          <IoFunnelOutline size={14} className="text-primary" />
          <span>Filtros de Pesquisa Avançada</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Search global */}
          <div className="relative">
            <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Buscar por nome, tel..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-slate-300 transition-all placeholder:text-slate-400 placeholder:font-semibold"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 outline-none hover:border-slate-200 transition-all cursor-pointer"
            >
              <option value="">Filtro: Todos Status</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Corretor filter */}
          <div>
            <select
              value={corretorFilter}
              onChange={e => setCorretorFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 outline-none hover:border-slate-200 transition-all cursor-pointer"
            >
              <option value="">Filtro: Todos Consultores</option>
              {corretores.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Group filter */}
          <div>
            <select
              value={grupoFilter}
              onChange={e => setGrupoFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 outline-none hover:border-slate-200 transition-all cursor-pointer truncate"
            >
              <option value="">Filtro: Todos Grupos</option>
              {grupos.map(g => (
                <option key={g.grupo_jid} value={g.grupo_jid}>👥 {g.grupo_nome}</option>
              ))}
            </select>
          </div>

          {/* Classification filter */}
          <div>
            <select
              value={classificacaoFilter}
              onChange={e => setClassificacaoFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 outline-none hover:border-slate-200 transition-all cursor-pointer"
            >
              <option value="">Filtro: Todas IA Classif.</option>
              {Object.entries(classificationConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-2xl shadow-slate-100/50 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-6 py-3 border-b border-slate-50">
                <LoadingSkeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <LoadingSkeleton className="h-4 w-1/4" />
                  <LoadingSkeleton className="h-3 w-1/2" />
                </div>
                <LoadingSkeleton className="h-6 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        ) : clientes.length === 0 ? (
          <div className="py-24 text-center">
            <span className="text-5xl block mb-4 opacity-30">👥</span>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Nenhum cliente qualificado</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto font-medium">
              Altere os filtros acima ou aguarde novos contatos serem capturados e qualificados pelo robô.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem / Grupo</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classificação IA</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Pipeline</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Última Interação</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold text-slate-700 text-xs">
                {clientes.map((cliente) => {
                  const hasGroup = !!cliente.grupo_nome;
                  const classif = cliente.classificacao || 'indefinido';
                  const classifObj = classificationConfig[classif] || classificationConfig.indefinido;
                  const statusObj = statusConfig[cliente.status] || { label: cliente.status, color: 'text-slate-500', bg: 'bg-slate-50' };

                  return (
                    <tr 
                      key={cliente.id}
                      className="hover:bg-slate-50/40 transition-colors duration-150 group"
                    >
                      {/* Name / Contact details */}
                      <td className="px-8 py-4.5">
                        <div className="flex items-center gap-4">
                          <div 
                            onClick={() => setSelectedLeadId(cliente.id)}
                            className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-black cursor-pointer shadow-md hover:scale-105 transition-transform"
                          >
                            {cliente.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span 
                              onClick={() => setSelectedLeadId(cliente.id)}
                              className="text-slate-900 font-black block hover:text-primary transition-colors cursor-pointer text-sm"
                            >
                              {cliente.nome}
                            </span>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-bold">
                              <span className="flex items-center gap-0.5"><IoLogoWhatsapp size={10} className="text-emerald-500" /> {cliente.telefone}</span>
                              {cliente.email && <span className="flex items-center gap-0.5">• <IoMailOutline size={10} /> {cliente.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Origin / WhatsApp Group */}
                      <td className="px-6 py-4.5 font-medium">
                        {hasGroup ? (
                          <span 
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-700 border border-violet-100 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm"
                            title={`JID: ${cliente.grupo_jid}`}
                          >
                            👥 {cliente.grupo_nome}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-wider">
                            {cliente.origem === 'whatsapp' ? '💬 WhatsApp' : cliente.origem === 'formulario' ? '📄 Formulário' : '📝 Manual'}
                          </span>
                        )}
                      </td>

                      {/* AI Classification badge */}
                      <td className="px-6 py-4.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${classifObj.bg} ${classifObj.color}`}>
                          {classifObj.label}
                        </span>
                      </td>

                      {/* Responsible Broker (Inline select) */}
                      <td className="px-6 py-4.5">
                        <select
                          value={cliente.corretor_id || ''}
                          onChange={e => handleQuickUpdateCorretor(cliente.id, e.target.value)}
                          className="px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-600 text-xs outline-none hover:bg-slate-100 transition-all cursor-pointer max-w-[150px]"
                        >
                          <option value="">Sem corretor</option>
                          {corretores.map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </select>
                      </td>

                      {/* Pipeline Status Select */}
                      <td className="px-6 py-4.5">
                        <select
                          value={cliente.status}
                          onChange={e => handleQuickUpdateStatus(cliente.id, e.target.value as StatusLead)}
                          className={`px-3 py-1.5 border rounded-xl font-black uppercase tracking-wider text-[9px] outline-none hover:opacity-90 transition-all cursor-pointer ${statusObj.bg} ${statusObj.color}`}
                        >
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <option key={key} value={key} className="text-slate-700 bg-white font-bold">{config.label.toUpperCase()}</option>
                          ))}
                        </select>
                      </td>

                      {/* Last Interaction */}
                      <td className="px-6 py-4.5 font-bold text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          {formatDistanceTime(cliente.criado_em)}
                        </span>
                      </td>

                      {/* View Details Action */}
                      <td className="px-8 py-4.5 text-right">
                        <button
                          onClick={() => setSelectedLeadId(cliente.id)}
                          className="p-2.5 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-500 rounded-xl transition-all border border-slate-100 hover:border-slate-900 shadow-sm"
                          title="Ver Ficha Cadastral"
                        >
                          <IoEyeOutline size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination component */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between px-10 py-6 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Exibindo <span className="text-slate-900">{(page - 1) * limit + 1}</span> — <span className="text-slate-900">{Math.min(page * limit, totalCount)}</span> de <span className="text-slate-900">{totalCount}</span> clientes
          </p>
          
          <div className="flex items-center gap-4">
            <button 
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Anterior
            </button>
            <span className="text-[10px] font-black text-primary px-2 uppercase tracking-widest">
              Página {page} de {totalPages}
            </span>
            <button 
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* Client Detail Drawer */}
      {selectedLeadId && (
        <ClienteDetailDrawer 
          leadId={selectedLeadId}
          corretores={corretores}
          onClose={() => setSelectedLeadId(null)}
          onUpdate={fetchClientes}
        />
      )}
    </div>
  );
}
