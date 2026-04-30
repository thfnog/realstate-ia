'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { LeadComCorretor, StatusLead, Evento, TipoEvento, Corretor } from '@/lib/database.types';
import { KanbanBoard } from '@/components/leads/KanbanBoard';
import { TableView } from '@/components/leads/TableView';
import { AgendaModal } from '@/components/leads/AgendaModal';
import { LeadsHeader } from '@/components/leads/LeadsHeader';
import { ManualLeadModal } from '@/components/leads/ManualLeadModal';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  novo: { label: 'Novo', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  em_atendimento: { label: 'Em atendimento', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  visita_agendada: { label: 'Visita agendada', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  negociacao: { label: 'Negociação', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  contrato: { label: 'Em Contrato', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
  fechado: { label: 'Fechado 🎉', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  sem_interesse: { label: 'Sem interesse', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
  descartado: { label: 'Descartado 🗑️', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
};

import { LoadingSkeleton, TableRowSkeleton } from '@/components/LoadingSkeleton';

export default function LeadsPage() {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
  const [leads, setLeads] = useState<LeadComCorretor[]>([]);
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [finalidadeFilter, setFinalidadeFilter] = useState<string>('');
  const [origemFilter, setOrigemFilter] = useState<string>('');
  const [corretorFilter, setCorretorFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'novo' | 'antigo' | 'interesse'>('novo');
  const [resending, setResending] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showManualModal, setShowManualModal] = useState(false);
  const limit = 50;
  
  // Agenda Modal
  const [selectedLead, setSelectedLead] = useState<LeadComCorretor | null>(null);
  const [leadEventos, setLeadEventos] = useState<Evento[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(false);
  const [leadMessages, setLeadMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newEvent, setNewEvent] = useState({
    tipo: 'visita' as TipoEvento, titulo: '', descricao: '', data_hora: '', local: '', corretor_id: ''
  });
  const [matchingImoveis, setMatchingImoveis] = useState<any[]>([]);
  const [loadingMatching, setLoadingMatching] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgStatus, setMsgStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL('/api/leads', window.location.origin);
      if (statusFilter) url.searchParams.set('status', statusFilter);
      if (origemFilter) url.searchParams.set('origem', origemFilter);
      if (finalidadeFilter) url.searchParams.set('finalidade', finalidadeFilter);
      if (corretorFilter) url.searchParams.set('corretor_id', corretorFilter);
      if (searchQuery) url.searchParams.set('search', searchQuery);
      
      url.searchParams.set('page', page.toString());
      url.searchParams.set('limit', limit.toString());
      
      const [resLeads, resCorretores] = await Promise.all([
        fetch(url.toString()),
        fetch('/api/corretores', { cache: 'no-store' }),
      ]);
      
      const data = await resLeads.json();
      const corretoresData = await resCorretores.json();

      if (Array.isArray(corretoresData)) {
        setCorretores(corretoresData.filter(c => c.ativo));
      }

      if (data && Array.isArray(data.data)) {
        setLeads(data.data);
        setTotalCount(data.count || 0);
      } else if (Array.isArray(data)) {
        setLeads(data);
        setTotalCount(data.length);
      }
    } catch (err) {
      console.error('Erro ao carregar leads:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, origemFilter, finalidadeFilter, corretorFilter, searchQuery, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, origemFilter, finalidadeFilter, corretorFilter, searchQuery]);

  useEffect(() => {
    fetchLeads();
    
    let channel: any = null;
    try {
      const { supabase } = require('@/lib/supabase');
      channel = supabase
        .channel('leads-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'leads' },
          (payload: any) => {
            fetchLeads();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('⚠️ Supabase Realtime não configurado ou falhou, mantendo polling.', err);
    }

    const interval = setInterval(fetchLeads, 120000); 

    return () => {
      clearInterval(interval);
      if (channel) {
        try {
          const { supabase } = require('@/lib/supabase');
          supabase.removeChannel(channel);
        } catch (e) {}
      }
    };
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
      toast.error('Erro ao atualizar consultor responsável');
    }
  }

  async function deleteLead(id: string, nome: string) {
    if (!confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE o lead ${nome}?`)) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== id));
      }
    } catch {
      toast.error('Erro ao excluir lead');
    }
  }

  async function resendBriefing(lead: LeadComCorretor) {
    if (!lead.corretor_id) {
      toast.warning('Este lead não tem corretor atribuído');
      return;
    }
    setResending(lead.id);
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resend_briefing: true }),
      });
      toast.success(`Briefing reenviado para o corretor de ${lead.nome}`);
    } catch {
      toast.error('Erro ao reenviar briefing');
    } finally {
      setResending(null);
    }
  }

  async function openAgendaModal(lead: LeadComCorretor) {
    setSelectedLead(lead);
    setLoadingEventos(true);
    setNewEvent({ tipo: 'visita', titulo: '', descricao: '', data_hora: '', local: '', corretor_id: '' });
    setMsgStatus('idle');
    
    try {
      const res = await fetch(`/api/eventos?lead_id=${lead.id}`);
      const data = await res.json();
      if (Array.isArray(data)) setLeadEventos(data);

      setLoadingMessages(true);
      fetch(`/api/leads/${lead.id}/messages`)
        .then(r => r.json())
        .then(msgs => {
          if (Array.isArray(msgs)) setLeadMessages(msgs);
        })
        .finally(() => setLoadingMessages(false));
      
      setLoadingMatching(true);
      const resMatch = await fetch(`/api/leads/${lead.id}/recommendations`);
      const suggestions = await resMatch.json();
      
      if (Array.isArray(suggestions)) {
        setMatchingImoveis(suggestions);
      } else {
        setMatchingImoveis([]);
      }
      
    } catch {
      console.error('Erro ao buscar eventos/sugestões');
    } finally {
      setLoadingEventos(false);
      setLoadingMatching(false);
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
          imobiliaria_id: selectedLead.imobiliaria_id,
          lead_id: selectedLead.id,
          corretor_id: selectedLead.corretor_id,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setLeadEventos(prev => [...prev, created].sort((a,b) => a.data_hora.localeCompare(b.data_hora)));
        setNewEvent({ tipo: 'visita', titulo: '', descricao: '', data_hora: '', local: '', corretor_id: '' });
        
        if (newEvent.tipo === 'visita' && (selectedLead.status === 'novo' || selectedLead.status === 'em_atendimento')) {
           setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: 'visita_agendada' as StatusLead } : l));
        }
      }
    } catch {
      toast.error('Erro ao criar evento');
    }
  }

  const filteredLeads = [...leads]
    .sort((a, b) => {
      if (sortOrder === 'interesse') {
        const valA = a.finalidade || '';
        const valB = b.finalidade || '';
        return valA.localeCompare(valB);
      }
      const dateA = new Date(a.criado_em).getTime();
      const dateB = new Date(b.criado_em).getTime();
      return sortOrder === 'novo' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="animate-fade-in pb-20 space-y-8">
      <LeadsHeader 
        viewMode={viewMode}
        setViewMode={setViewMode}
        leadsCount={totalCount}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        corretorFilter={corretorFilter}
        setCorretorFilter={setCorretorFilter}
        origemFilter={origemFilter}
        setOrigemFilter={setOrigemFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        finalidadeFilter={finalidadeFilter}
        setFinalidadeFilter={setFinalidadeFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        corretores={corretores}
        onAddLead={() => setShowManualModal(true)}
        onRefresh={fetchLeads}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="bg-white rounded-[2rem] border border-slate-100 p-8 space-y-4 shadow-xl shadow-slate-200/50">
              <LoadingSkeleton className="h-4 w-24" />
              <LoadingSkeleton className="h-6 w-full" />
              <LoadingSkeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="bg-white rounded-[3rem] border border-dashed border-slate-200 p-24 text-center">
          <p className="text-7xl mb-6 opacity-20">📭</p>
          <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Nenhum lead encontrado com estes filtros</p>
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard 
          filteredLeads={filteredLeads} 
          statusFilter={statusFilter} 
          deleteLead={deleteLead} 
          openAgendaModal={openAgendaModal} 
          updateStatus={updateStatus} 
        />
      ) : (
        <TableView 
          filteredLeads={filteredLeads}
          corretores={corretores}
          deleteLead={deleteLead}
          openAgendaModal={openAgendaModal}
          updateStatus={updateStatus}
          updateCorretor={updateCorretor}
          resendBriefing={resendBriefing}
          resending={resending}
        />
      )}

      {/* Pagination Controls */}
      {Math.ceil(totalCount / limit) > 1 && (
        <div className="flex items-center justify-between px-10 py-6 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Exibindo <span className="text-slate-900">{(page - 1) * limit + 1}</span> — <span className="text-slate-900">{Math.min(page * limit, totalCount)}</span> de <span className="text-slate-900">{totalCount}</span> leads
          </p>
          <div className="flex items-center gap-4">
            <button 
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Anterior
            </button>
            <span className="text-[10px] font-black text-primary px-2 uppercase tracking-widest">
              Página {page} / {Math.ceil(totalCount / limit)}
            </span>
            <button 
              disabled={page >= Math.ceil(totalCount / limit)}
              onClick={() => setPage(page + 1)}
              className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {selectedLead && (
        <AgendaModal 
          selectedLead={selectedLead}
          setSelectedLead={setSelectedLead}
          leadEventos={leadEventos}
          loadingEventos={loadingEventos}
          leadMessages={leadMessages}
          loadingMessages={loadingMessages}
          matchingImoveis={matchingImoveis}
          loadingMatching={loadingMatching}
          newEvent={newEvent}
          setNewEvent={setNewEvent}
          handleCreateEvent={handleCreateEvent}
          sendingMsg={sendingMsg}
          msgStatus={msgStatus}
          setSendingMsg={setSendingMsg}
          setMsgStatus={setMsgStatus}
          updateStatus={updateStatus}
          deleteLead={deleteLead}
          corretores={corretores}
        />
      )}

      {showManualModal && (
        <ManualLeadModal 
          onClose={() => setShowManualModal(false)}
          onSuccess={() => fetchLeads()}
          corretores={corretores}
        />
      )}
    </div>
  );
}
