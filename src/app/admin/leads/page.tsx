'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { LeadComCorretor, StatusLead, Evento, TipoEvento, Corretor } from '@/lib/database.types';
import { KanbanBoard } from '@/components/leads/KanbanBoard';
import { TableView } from '@/components/leads/TableView';
import { AgendaModal } from '@/components/leads/AgendaModal';
import { LeadsHeader } from '@/components/leads/LeadsHeader';

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

export default function LeadsPage() {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
  const [leads, setLeads] = useState<LeadComCorretor[]>([]);
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [origemFilter, setOrigemFilter] = useState<string>('');
  const [corretorFilter, setCorretorFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [resending, setResending] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
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
        // Fallback in case of old API response
        setLeads(data);
        setTotalCount(data.length);
      }
    } catch (err) {
      console.error('Erro ao carregar leads:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchLeads();
    
    let channel: any = null;
    try {
      const { supabase } = require('@/lib/supabase');
      // Subscribe to real-time changes on the 'leads' table
      channel = supabase
        .channel('leads-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'leads' },
          (payload: any) => {
            console.log('🔄 Atualização recebida em tempo real (Leads):', payload);
            fetchLeads();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('⚠️ Supabase Realtime não configurado ou falhou, mantendo polling.', err);
    }

    // Polling de fallback (mais lento agora que temos realtime)
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
      // Re-trigger processing by calling PATCH (the server can hook into this)
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
    setMsgStatus('idle'); // Reset messaging status
    
    try {
      const res = await fetch(`/api/eventos?lead_id=${lead.id}`);
      const data = await res.json();
      if (Array.isArray(data)) setLeadEventos(data);

      // Fetch message history
      setLoadingMessages(true);
      fetch(`/api/leads/${lead.id}/messages`)
        .then(r => r.json())
        .then(msgs => {
          if (Array.isArray(msgs)) setLeadMessages(msgs);
        })
        .finally(() => setLoadingMessages(false));
      
      // Also fetch matching imoveis from centralized API
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
        
        // Auto-update lead status locally if it changed
        if (newEvent.tipo === 'visita' && (selectedLead.status === 'novo' || selectedLead.status === 'em_atendimento')) {
           setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: 'visita_agendada' as StatusLead } : l));
        }
      }
    } catch {
      toast.error('Erro ao criar evento');
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

  // Computed Leads (Filtered)
  const filteredLeads = leads.filter(l => {
    if (origemFilter && l.origem !== origemFilter) return false;
    if (corretorFilter && l.corretor_id !== corretorFilter) return false;
    if (searchQuery) {
      const s = searchQuery.toLowerCase();
      return l.nome.toLowerCase().includes(s) || l.telefone.includes(s);
    }
    return true;
  });

  return (
    <div className="animate-fade-in pb-10 sm:pb-0">
      <LeadsHeader 
        viewMode={viewMode}
        setViewMode={setViewMode}
        leadsCount={leads.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        corretorFilter={corretorFilter}
        setCorretorFilter={setCorretorFilter}
        origemFilter={origemFilter}
        setOrigemFilter={setOrigemFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        corretores={corretores}
      />

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
      ) : filteredLeads.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-light p-12 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-text-secondary">Nenhum lead encontrado com estes filtros</p>
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

      {/* Pagination Controls (Shared for both Table and Kanban) */}
      {Math.ceil(totalCount / limit) > 1 && (
        <div className="flex items-center justify-between px-6 py-4 mt-6 bg-white rounded-2xl border border-border-light shadow-sm">
          <p className="text-xs text-text-secondary">
            Mostrando <span className="font-bold text-text-primary">{(page - 1) * limit + 1}</span> até <span className="font-bold text-text-primary">{Math.min(page * limit, totalCount)}</span> de <span className="font-bold text-text-primary">{totalCount}</span> leads
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border-light bg-white text-text-secondary hover:bg-slate-50 hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Anterior
            </button>
            <span className="text-xs font-medium text-text-muted px-2">
              {page} / {Math.ceil(totalCount / limit)}
            </span>
            <button 
              disabled={page >= Math.ceil(totalCount / limit)}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border-light bg-white text-text-secondary hover:bg-slate-50 hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* Agenda/Processes Modal */}
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
          corretores={corretores}
        />
      )}
    </div>
  );
}
