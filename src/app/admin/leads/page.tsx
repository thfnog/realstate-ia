'use client';

import { useEffect, useState, useCallback } from 'react';
import type { LeadComCorretor, StatusLead, Evento, TipoEvento, Corretor } from '@/lib/database.types';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  novo: { label: 'Novo', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  em_atendimento: { label: 'Em atendimento', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  visita_agendada: { label: 'Visita agendada', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  negociacao: { label: 'Negociação', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  contrato: { label: 'Em Contrato', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
  fechado: { label: 'Fechado 🎉', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  sem_interesse: { label: 'Sem interesse', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
};

export default function LeadsPage() {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
  const [leads, setLeads] = useState<LeadComCorretor[]>([]);
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [origemFilter, setOrigemFilter] = useState<string>('');
  const [resending, setResending] = useState<string | null>(null);
  
  // Agenda Modal
  const [selectedLead, setSelectedLead] = useState<LeadComCorretor | null>(null);
  const [leadEventos, setLeadEventos] = useState<Evento[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(false);
  const [newEvent, setNewEvent] = useState({
    tipo: 'visita' as TipoEvento, titulo: '', descricao: '', data_hora: '', local: ''
  });

  const fetchLeads = useCallback(async () => {
    try {
      const url = new URL('/api/leads', window.location.origin);
      if (statusFilter) url.searchParams.set('status', statusFilter);
      
      const [resLeads, resCorretores] = await Promise.all([
        fetch(url.toString()),
        fetch('/api/corretores', { cache: 'no-store' }),
      ]);
      
      let data = await resLeads.json();
      const corretoresData = await resCorretores.json();

      if (Array.isArray(corretoresData)) {
        setCorretores(corretoresData.filter(c => c.ativo));
      }

      if (Array.isArray(data)) {
        if (origemFilter) {
          data = data.filter((l: LeadComCorretor) => l.origem === origemFilter);
        }
        setLeads(data);
      }
    } catch (err) {
      console.error('Erro ao carregar leads:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, origemFilter]);

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  async function updateStatus(id: string, status: StatusLead) {
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status } : l))
      );
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  }

  async function updateCorretor(id: string, novoCorretorId: string) {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corretor_id: novoCorretorId }),
      });
      if (res.ok) {
        const _corretorObj = novoCorretorId ? corretores.find(c => c.id === novoCorretorId) : null;
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, corretor_id: novoCorretorId, corretores: _corretorObj || null } : l))
        );
      }
    } catch {
      alert('Erro ao atualizar consultor responsável');
    }
  }

  async function resendBriefing(lead: LeadComCorretor) {
    if (!lead.corretor_id) {
      alert('Este lead não tem corretor atribuído');
      return;
    }
    setResending(lead.id);
    try {
      // Re-trigger processing by calling PATCH (the server can hook into this)
      await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resend_briefing: true }),
      });
      alert(`Briefing reenviado para o corretor de ${lead.nome}`);
    } catch {
      alert('Erro ao reenviar briefing');
    } finally {
      setResending(null);
    }
  }

  async function openAgendaModal(lead: LeadComCorretor) {
    setSelectedLead(lead);
    setLoadingEventos(true);
    setNewEvent({ tipo: 'visita', titulo: '', descricao: '', data_hora: '', local: '' });
    
    try {
      const res = await fetch(`/api/eventos?lead_id=${lead.id}`);
      const data = await res.json();
      if (Array.isArray(data)) setLeadEventos(data);
    } catch {
      console.error('Erro ao buscar eventos');
    } finally {
      setLoadingEventos(false);
    }
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLead) return;

    try {
      const res = await fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEvent,
          lead_id: selectedLead.id,
          corretor_id: selectedLead.corretor_id,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setLeadEventos(prev => [...prev, created].sort((a,b) => a.data_hora.localeCompare(b.data_hora)));
        setNewEvent({ tipo: 'visita', titulo: '', descricao: '', data_hora: '', local: '' });
        
        // Auto-update lead status locally if it changed
        if (newEvent.tipo === 'visita' && (selectedLead.status === 'novo' || selectedLead.status === 'em_atendimento')) {
           setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: 'visita_agendada' as StatusLead } : l));
        }
      }
    } catch {
      alert('Erro ao criar evento');
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function isRecent(dateStr: string): boolean {
    return Date.now() - new Date(dateStr).getTime() < 30 * 60 * 1000; // 30 minutes
  }

  function getProfileSummary(lead: LeadComCorretor): string {
    const parts: string[] = [];
    if (lead.finalidade) {
      const f: Record<string, string> = { comprar: 'Compra', alugar: 'Aluguel', investir: 'Investimento' };
      parts.push(f[lead.finalidade] || lead.finalidade);
    }
    if (lead.tipo_interesse) parts.push(lead.tipo_interesse);
    if (lead.quartos_interesse) parts.push(`${lead.quartos_interesse}q`);
    if (lead.orcamento) parts.push(`R$${(lead.orcamento / 1000).toFixed(0)}k`);
    if (lead.bairros_interesse?.length) parts.push(lead.bairros_interesse.slice(0, 2).join(', '));
    return parts.join(' • ') || 'Sem detalhes';
  }

  function getWhatsAppLink(phone: string): string {
    return `https://wa.me/${phone.replace(/\D/g, '')}`;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Funil de Vendas</h1>
          <p className="text-text-secondary text-sm mt-1">
            {viewMode === 'kanban' ? 'Visão por estágios' : 'Visão em lista'} • {leads.length} lead(s)
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Toggle View Mode */}
          <div className="flex bg-surface-alt p-1 rounded-xl border border-border-light shadow-inner">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              📋 Tabela
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'kanban' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              📊 Funil
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={origemFilter}
              onChange={(e) => setOrigemFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Todas origens</option>
              <option value="formulario">Formulário</option>
              <option value="email_ego">E-mail eGO</option>
              <option value="webhook_grupozap">Grupo OLX</option>
              <option value="whatsapp">WhatsApp</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Todos os status</option>
              <option value="novo">Novos</option>
              <option value="em_atendimento">Em atendimento</option>
              <option value="visita_agendada">Visita agendada</option>
              <option value="negociacao">Negociação</option>
              <option value="contrato">Em Contrato</option>
              <option value="fechado">Fechados</option>
              <option value="sem_interesse">Sem interesse</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-border-light p-5 animate-pulse">
              <div className="h-4 w-32 bg-surface-alt rounded mb-3" />
              <div className="h-3 w-48 bg-surface-alt rounded mb-2" />
              <div className="h-3 w-64 bg-surface-alt rounded" />
            </div>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-light p-12 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-text-secondary">Nenhum lead encontrado</p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* ===== KANBAN VIEW (Funil de Vendas) ===== */
        <div className="flex gap-4 min-h-[600px] overflow-x-auto pb-8 scrollbar-hide">
           {['novo', 'em_atendimento', 'visita_agendada', 'negociacao', 'contrato', 'fechado'].map((status) => {
              const columnLeads = leads.filter(l => l.status === status);
              const config = statusConfig[status];
              return (
                <div key={status} className="flex flex-col gap-4 min-w-[300px] max-w-[300px]">
                   {/* Column Header */}
                   <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${config.bg.replace('bg-', 'bg-')}`} />
                        <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{config.label}</h3>
                      </div>
                      <span className="text-[10px] font-black text-text-muted bg-white border border-border-light px-2 py-0.5 rounded-full shadow-sm">
                        {columnLeads.length}
                      </span>
                   </div>

                   {/* Cards Container */}
                   <div className="flex-1 bg-surface-alt/50 rounded-[2rem] border border-border-light/50 p-3 space-y-3 min-h-[500px]">
                      {columnLeads.map(lead => (
                        <div 
                          key={lead.id}
                          className="bg-white p-5 rounded-2xl border border-border-light shadow-sm hover:shadow-xl hover:border-primary/20 transition-all group cursor-pointer relative overflow-hidden"
                          onClick={() => openAgendaModal(lead)}
                        >
                           {/* Status line at top */}
                           <div className={`absolute top-0 left-0 right-0 h-1 ${config.bg.split(' ')[0]}`} />

                           <div className="flex justify-between items-start mb-3">
                              <div>
                                 <h4 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">{lead.nome}</h4>
                                 <p className="text-[10px] text-text-muted mt-0.5">{lead.telefone}</p>
                              </div>
                              <div className="flex gap-1.5">
                                 {lead.origem === 'whatsapp' && (
                                    <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-xs animate-pulse" title="Vindo do WhatsApp Bot">
                                       🤖
                                    </div>
                                 )}
                                 <div className="w-6 h-6 rounded-lg bg-surface-alt flex items-center justify-center text-[10px] grayscale group-hover:grayscale-0 transition-all border border-border-light shadow-sm">
                                    {(() => {
                                       const { getOrigemLabel } = require('@/lib/countryConfig');
                                       return getOrigemLabel(lead.origem).icon;
                                    })()}
                                 </div>
                              </div>
                           </div>
                           
                           <div className="bg-surface-alt/50 p-3 rounded-xl border border-border-light/50 mb-4">
                              <p className="text-[10px] font-bold text-text-primary leading-tight">
                                 {getProfileSummary(lead)}
                              </p>
                           </div>

                           <div className="flex items-center justify-between pt-3 border-t border-border-light/50">
                              <div className="flex items-center gap-2">
                                 {lead.corretores ? (
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-[10px] text-white font-black border-2 border-white shadow-sm" title={lead.corretores.nome}>
                                       {lead.corretores.nome.charAt(0)}
                                    </div>
                                 ) : (
                                    <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center text-[10px] text-rose-500 font-black border-2 border-white shadow-sm" title="Sem corretor">
                                       ?
                                    </div>
                                 )}
                                 <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{lead.corretores?.nome.split(' ')[0] || 'Ninguém'}</span>
                              </div>
                              <span className="text-[9px] font-black text-text-tertiary uppercase">{formatDate(lead.criado_em).split(',')[0]}</span>
                           </div>
                        </div>
                      ))}
                      
                      {columnLeads.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border-light/30 rounded-2xl opacity-40">
                           <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Livre</span>
                        </div>
                      )}
                   </div>
                </div>
              );
           })}
        </div>
      ) : (
        /* ===== TABLE VIEW (Visão em Lista) ===== */
        <div className="bg-white rounded-[2rem] border border-border-light overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light bg-surface-alt/50">
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Origem</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">WhatsApp</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Perfil</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Corretor</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Data/Hora</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-text-secondary">Ações</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const status = statusConfig[lead.status] || statusConfig.novo;
                  const recent = isRecent(lead.criado_em);
                  return (
                    <tr key={lead.id} className="border-b border-border-light last:border-0 hover:bg-surface-hover transition-colors">
                      {/* Nome + recent indicator */}
                      <td className="px-4 py-3 font-medium text-text-primary">
                        <div className="flex items-center gap-2">
                          {recent && (
                            <span className="relative flex h-2.5 w-2.5 shrink-0" title="Lead recente (< 30 min)">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                          )}
                          <span className="truncate max-w-[150px]">{lead.nome}</span>
                        </div>
                      </td>

                      {/* Origem */}
                      <td className="px-4 py-3">
                        {(() => {
                           const { getOrigemLabel } = require('@/lib/countryConfig');
                           const info = getOrigemLabel(lead.origem || 'desconhecido');
                           return (
                             <div className="flex flex-col">
                               <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${info.color} bg-opacity-30 border-0`}>
                                 {info.icon} {info.label}
                               </span>
                               {lead.portal_origem && (
                                 <span className="text-[10px] text-text-muted mt-0.5 max-w-[100px] truncate" title={lead.portal_origem}>
                                   via {lead.portal_origem}
                                 </span>
                               )}
                             </div>
                           );
                        })()}
                      </td>

                      {/* WhatsApp (clickable) */}
                      <td className="px-4 py-3">
                        <a
                          href={getWhatsAppLink(lead.telefone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.266-1.232l-.29-.174-3.176.944.944-3.176-.174-.29A8 8 0 1112 20z" />
                          </svg>
                          {lead.telefone}
                        </a>
                      </td>

                      {/* Perfil */}
                      <td className="px-4 py-3 text-text-muted max-w-[200px]">
                        <span className="truncate block">{getProfileSummary(lead)}</span>
                        {lead.descricao_interesse && (
                          <span className="text-xs italic text-text-muted/70 truncate block" title={lead.descricao_interesse}>
                            &ldquo;{lead.descricao_interesse.slice(0, 50)}...&rdquo;
                          </span>
                        )}
                      </td>

                      {/* Corretor */}
                      <td className="px-4 py-3">
                        <select
                          value={lead.corretor_id || ''}
                          onChange={(e) => updateCorretor(lead.id, e.target.value)}
                          className={`text-xs px-2.5 py-1.5 rounded-full border font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer max-w-[130px] truncate ${
                            !lead.corretor_id 
                              ? 'bg-red-50 border-red-200 text-red-600' 
                              : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          }`}
                        >
                          <option value="" disabled className="text-red-500">
                            ⚠️ Selecionar Corretor
                          </option>
                          {corretores.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Data/hora */}
                      <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                        {formatDate(lead.criado_em)}
                      </td>

                      {/* Status dropdown (inline save) */}
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => updateStatus(lead.id, e.target.value as StatusLead)}
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer ${status.bg} ${status.color}`}
                        >
                          <option value="novo">Novo</option>
                          <option value="em_atendimento">Em atendimento</option>
                          <option value="visita_agendada">Visita agendada</option>
                          <option value="fechado">Fechado</option>
                          <option value="sem_interesse">Sem interesse</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="px-2 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openAgendaModal(lead)}
                            title="Agenda / Detalhes"
                            className="p-1.5 rounded-lg text-text-muted hover:text-indigo-600 hover:bg-indigo-50 transition-all font-medium flex items-center gap-1.5 text-xs border border-transparent hover:border-indigo-100"
                          >
                            📅 <span className="hidden xl:inline">Processo</span>
                          </button>
                          
                          <button
                            onClick={() => resendBriefing(lead)}
                            disabled={resending === lead.id || !lead.corretor_id}
                            title={!lead.corretor_id ? "⚠️ Atribua um corretor primeiro" : "Reenviar briefing"}
                            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary-subtle transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-text-muted cursor-pointer disabled:cursor-not-allowed"
                          >
                            {resending === lead.id ? (
                              <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin block" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Agenda/Processes Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelectedLead(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-border-light flex justify-between items-start bg-surface-alt">
              <div>
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                  <span className="text-2xl">👤</span> {selectedLead.nome}
                </h2>
                <div className="text-sm text-text-secondary mt-1 flex gap-3">
                  <span>📱 {selectedLead.telefone}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${statusConfig[selectedLead.status]?.bg} ${statusConfig[selectedLead.status]?.color}`}>
                    {statusConfig[selectedLead.status]?.label}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="p-2 text-text-muted hover:text-danger hover:bg-red-50 rounded-lg transition-colors">
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
              {/* Left col: Event history */}
              <div className="flex-1 p-6 border-r border-border-light bg-slate-50/30">
                <h3 className="font-semibold text-text-primary mb-5 flex items-center gap-2">
                  <span>📅</span> Histórico de Processos
                </h3>
                
                {loadingEventos ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-20 bg-slate-100 rounded-xl"></div>
                    <div className="h-20 bg-slate-100 rounded-xl"></div>
                  </div>
                ) : leadEventos.length === 0 ? (
                  <div className="text-center py-10 bg-white border border-dashed border-border-light rounded-xl">
                    <p className="text-3xl mb-2">📭</p>
                    <p className="text-sm text-text-secondary">Nenhum agendamento neste processo.</p>
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                    {leadEventos.map((evt, idx) => (
                      <div key={evt.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        {/* Timeline dot */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                          <span className="text-lg">{evt.tipo === 'visita' ? '🏠' : evt.tipo === 'assinatura' ? '✍️' : evt.tipo === 'cartorio' ? '🏛️' : '📌'}</span>
                        </div>
                        
                        {/* Card */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border-light bg-white shadow-sm transition-all hover:shadow-md">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{evt.tipo}</span>
                            <span className="text-xs font-semibold text-slate-500">{formatDate(evt.data_hora)}</span>
                          </div>
                          <h4 className="font-semibold text-text-primary text-sm">{evt.titulo}</h4>
                          <p className="text-xs text-text-secondary mt-1">{evt.descricao || 'Sem descrição'}</p>
                          {evt.local && (
                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">📍 {evt.local}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right col: New Event Form */}
              <div className="md:w-80 p-6 bg-white shrink-0">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <span>➕</span> Novo Agendamento
                </h3>
                
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Tipo de Evento</label>
                    <select 
                      value={newEvent.tipo} onChange={e => setNewEvent({...newEvent, tipo: e.target.value as TipoEvento})}
                      className="w-full text-sm px-3 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="visita">🏠 Visita</option>
                      <option value="reuniao">🤝 Reunião</option>
                      <option value="vistoria">🔍 Vistoria</option>
                      <option value="cartorio">🏛️ Cartório</option>
                      <option value="assinatura">✍️ Assinatura</option>
                      <option value="outro">📌 Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Data e Hora</label>
                    <input 
                      type="datetime-local" required
                      value={newEvent.data_hora} onChange={e => setNewEvent({...newEvent, data_hora: e.target.value})}
                      className="w-full text-sm px-3 py-2 rounded-lg border focus:ring-2 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Título Breve</label>
                    <input 
                      type="text" required placeholder="Ex: Assinatura de Promessa"
                      value={newEvent.titulo} onChange={e => setNewEvent({...newEvent, titulo: e.target.value})}
                      className="w-full text-sm px-3 py-2 rounded-lg border focus:ring-2 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Local (opcional)</label>
                    <input 
                      type="text" placeholder="Endereço ou Link"
                      value={newEvent.local} onChange={e => setNewEvent({...newEvent, local: e.target.value})}
                      className="w-full text-sm px-3 py-2 rounded-lg border focus:ring-2 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Observações</label>
                    <textarea 
                      rows={2} placeholder="Detalhes extras..."
                      value={newEvent.descricao} onChange={e => setNewEvent({...newEvent, descricao: e.target.value})}
                      className="w-full text-sm px-3 py-2 rounded-lg border focus:ring-2 outline-none resize-none"
                    />
                  </div>

                  <button type="submit" className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium text-sm transition-all">
                    Agendar Evento
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
