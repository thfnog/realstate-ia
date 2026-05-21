'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  IoCloseOutline, IoPersonOutline, IoCallOutline, IoMailOutline, 
  IoCashOutline, IoCalendarOutline, IoChatboxEllipsesOutline, IoMicOutline, 
  IoSendOutline, IoTimeOutline, IoLocationOutline, IoLogoWhatsapp, 
  IoCheckmarkCircleOutline, IoBriefcaseOutline, IoEyeOutline 
} from 'react-icons/io5';
import type { LeadComCorretor, StatusLead, Corretor, Evento } from '@/lib/database.types';
import { ImoveisMatchPanel } from '@/components/leads/ImoveisMatchPanel';

interface ClienteDetailDrawerProps {
  leadId: string;
  corretores: Corretor[];
  onClose: () => void;
  onUpdate: () => void;
}

type TabType = 'ficha' | 'timeline' | 'chat' | 'matches';

export function ClienteDetailDrawer({ leadId, corretores, onClose, onUpdate }: ClienteDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('ficha');
  const [lead, setLead] = useState<LeadComCorretor | null>(null);
  const [loadingLead, setLoadingLead] = useState(true);
  
  // Ficha edit states
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [orcamento, setOrcamento] = useState('');
  const [tipoInteresse, setTipoInteresse] = useState('');
  const [finalidade, setFinalidade] = useState('');
  const [bairros, setBairros] = useState('');
  const [quartos, setQuartos] = useState('');
  const [vagas, setVagas] = useState('');
  const [area, setArea] = useState('');
  const [corretorId, setCorretorId] = useState('');
  const [status, setStatus] = useState<StatusLead>('novo');
  const [descricaoInteresse, setDescricaoInteresse] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [classificacao, setClassificacao] = useState('');
  const [classificacaoMotivo, setClassificacaoMotivo] = useState('');
  const [savingFicha, setSavingFicha] = useState(false);

  // Timeline events state
  const [events, setEvents] = useState<Evento[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [newEvent, setNewEvent] = useState({
    titulo: '',
    tipo: 'visita',
    data_hora: '',
    local: '',
    descricao: ''
  });
  const [submittingEvent, setSubmittingEvent] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Matches state
  const [matchingImoveis, setMatchingImoveis] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const fetchLeadData = useCallback(async () => {
    try {
      setLoadingLead(true);
      const res = await fetch(`/api/clientes/${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setLead(data);
        
        // Initialize Ficha states
        setNome(data.nome || '');
        setEmail(data.email || '');
        setTelefone(data.telefone || '');
        setOrcamento(data.orcamento?.toString() || '');
        setTipoInteresse(data.tipo_interesse || '');
        setFinalidade(data.finalidade || '');
        setBairros(data.bairros_interesse?.join(', ') || '');
        setQuartos(data.quartos_interesse?.toString() || '');
        setVagas(data.vagas_interesse?.toString() || '');
        setArea(data.area_interesse?.toString() || '');
        setCorretorId(data.corretor_id || '');
        setStatus(data.status || 'novo');
        setDescricaoInteresse(data.descricao_interesse || '');
        setObservacoes(data.observacoes || '');
        setClassificacao(data.classificacao || 'indefinido');
        setClassificacaoMotivo(data.classificacao_motivo || '');
      } else {
        toast.error('Erro ao carregar dados do cliente');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao carregar cliente');
    } finally {
      setLoadingLead(false);
    }
  }, [leadId]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const res = await fetch(`/api/eventos?lead_id=${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEvents(false);
    }
  }, [leadId]);

  const fetchMessages = useCallback(async () => {
    try {
      setLoadingMessages(true);
      const res = await fetch(`/api/leads/${leadId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  }, [leadId]);

  const fetchMatches = useCallback(async () => {
    try {
      setLoadingMatches(true);
      const res = await fetch(`/api/leads/${leadId}/recommendations`);
      if (res.ok) {
        const data = await res.json();
        setMatchingImoveis(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMatches(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLeadData();
  }, [fetchLeadData]);

  // Handle tab switching queries
  useEffect(() => {
    if (activeTab === 'timeline') {
      fetchEvents();
    } else if (activeTab === 'chat') {
      fetchMessages();
    } else if (activeTab === 'matches') {
      fetchMatches();
    }
  }, [activeTab, fetchEvents, fetchMessages, fetchMatches]);

  // Set up message polling when chat tab is open
  useEffect(() => {
    if (activeTab !== 'chat') return;
    const interval = setInterval(() => {
      fetchMessages();
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab, fetchMessages]);

  async function handleUpdateFicha(e: React.FormEvent) {
    e.preventDefault();
    setSavingFicha(true);
    try {
      const bairrosArray = bairros.split(',').map(b => b.trim()).filter(b => b.length > 0);
      const res = await fetch(`/api/clientes/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          email: email || null,
          telefone,
          orcamento: orcamento ? parseFloat(orcamento) : null,
          tipo_interesse: tipoInteresse || null,
          finalidade: finalidade || null,
          bairros_interesse: bairrosArray,
          quartos_interesse: quartos ? parseInt(quartos) : null,
          vagas_interesse: vagas ? parseInt(vagas) : null,
          area_interesse: area ? parseFloat(area) : null,
          corretor_id: corretorId || null,
          status,
          descricao_interesse: descricaoInteresse || null,
          observacoes: observacoes || null,
          classificacao: classificacao || null,
          classificacao_motivo: classificacaoMotivo || null
        })
      });

      if (res.ok) {
        toast.success('Ficha cadastral atualizada!');
        fetchLeadData();
        onUpdate();
      } else {
        toast.error('Erro ao atualizar ficha');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao salvar ficha');
    } finally {
      setSavingFicha(false);
    }
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newEvent.titulo || !newEvent.data_hora) {
      toast.error('Título e Data/Hora são obrigatórios');
      return;
    }
    setSubmittingEvent(true);
    try {
      const res = await fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          ...newEvent
        })
      });

      if (res.ok) {
        toast.success('Compromisso agendado com sucesso!');
        setNewEvent({
          titulo: '',
          tipo: 'visita',
          data_hora: '',
          local: '',
          descricao: ''
        });
        fetchEvents();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Erro ao agendar compromisso');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao agendar compromisso');
    } finally {
      setSubmittingEvent(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || sendingMessage) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput })
      });

      if (res.ok) {
        const textSent = chatInput;
        setChatInput('');
        toast.success('Mensagem enviada!');
        
        // Add locally immediately to improve UX while polling loads it
        const newLocalMsg = {
          id: crypto.randomUUID(),
          direction: 'outbound',
          message_text: textSent,
          media_type: 'text',
          criado_em: new Date().toISOString()
        };
        setMessages(prev => [...prev, newLocalMsg]);
        
        fetchMessages();
      } else {
        toast.error('Erro ao enviar mensagem');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  }

  const getStatusBadgeClass = (statusStr: string) => {
    switch (statusStr) {
      case 'novo': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'em_atendimento': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'visita_agendada': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'negociacao': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'contrato': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'fechado': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const getClassificationLabel = (cls: string) => {
    const map: Record<string, string> = {
      comprador: '🛒 Comprador',
      vendedor: '🔑 Vendedor',
      locatario: '🏠 Locatário',
      investidor: '📈 Investidor',
      corretor_parceiro: '🤝 Corretor Parceiro',
      proprietario: '💼 Proprietário',
      curioso: '🕵️ Curioso',
      indefinido: '❓ Indefinido'
    };
    return map[cls] || cls;
  };

  const formatDistanceTime = (dateStr: string) => {
    const distance = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(distance / (60 * 1000));
    const hours = Math.floor(distance / (60 * 60 * 1000));
    const days = Math.floor(distance / (24 * 60 * 60 * 1000));

    if (mins < 60) return `Há ${mins} min`;
    if (hours < 24) return `Há ${hours} h`;
    return `Há ${days} dias`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Slide-over Content */}
      <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col z-10 animate-slide-in-right">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {loadingLead ? 'Carregando cliente...' : lead?.nome}
              </h2>
              {lead?.status && (
                <span className={`px-2.5 py-0.5 border rounded-lg text-[9px] font-black uppercase tracking-wider ${getStatusBadgeClass(lead.status)}`}>
                  {lead.status.replace('_', ' ')}
                </span>
              )}
              {lead?.classificacao && (
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider border border-slate-200">
                  {getClassificationLabel(lead.classificacao)}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Ficha de Atendimento CRM
            </p>
          </div>
          
          <button 
            onClick={onClose} 
            className="p-2 bg-white hover:bg-slate-100 rounded-xl transition-all border border-slate-100 shadow-sm"
          >
            <IoCloseOutline size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-100 px-8 py-2.5 flex gap-4 shrink-0 bg-slate-50/30">
          {(['ficha', 'timeline', 'chat', 'matches'] as const).map((tab) => {
            const labels: Record<TabType, string> = {
              ficha: '📋 Ficha Cadastral',
              timeline: '📅 Linha do Tempo',
              chat: '💬 WhatsApp Chat',
              matches: '🎯 Matches de Imóveis'
            };
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Tab Scroll Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loadingLead ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-950 rounded-full animate-spin" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando Ficha...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: FICHA CADASTRAL FORM */}
              {activeTab === 'ficha' && (
                <form onSubmit={handleUpdateFicha} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">
                        👤 Dados Básicos
                      </h3>
                      
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Nome Completo</label>
                        <div className="relative">
                          <IoPersonOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            value={nome}
                            onChange={e => setNome(e.target.value)}
                            required
                            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-slate-300"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Telefone</label>
                          <div className="relative">
                            <IoCallOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="text" 
                              value={telefone}
                              onChange={e => setTelefone(e.target.value)}
                              required
                              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-slate-300"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">E-mail</label>
                          <div className="relative">
                            <IoMailOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="email" 
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-slate-300"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Corretor Responsável</label>
                          <select 
                            value={corretorId}
                            onChange={e => setCorretorId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
                          >
                            <option value="">Nenhum</option>
                            {corretores.map(c => (
                              <option key={c.id} value={c.id}>{c.nome}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Status Atendimento</label>
                          <select 
                            value={status}
                            onChange={e => setStatus(e.target.value as StatusLead)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
                          >
                            <option value="novo">Novo</option>
                            <option value="em_atendimento">Em atendimento</option>
                            <option value="visita_agendada">Visita agendada</option>
                            <option value="negociacao">Negociação</option>
                            <option value="contrato">Em contrato</option>
                            <option value="fechado">Fechado</option>
                            <option value="sem_interesse">Sem interesse</option>
                            <option value="descartado">Descartado</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* IA & Classificacao */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">
                        🤖 Inteligência Artificial
                      </h3>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Classificação IA</label>
                        <select 
                          value={classificacao}
                          onChange={e => setClassificacao(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
                        >
                          <option value="indefinido">Indefinido</option>
                          <option value="comprador">Comprador</option>
                          <option value="vendedor">Vendedor</option>
                          <option value="locatario">Locatário</option>
                          <option value="investidor">Investidor</option>
                          <option value="corretor_parceiro">Corretor Parceiro</option>
                          <option value="proprietario">Proprietário</option>
                          <option value="curioso">Curioso</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Justificativa da Classificação</label>
                        <textarea 
                          value={classificacaoMotivo}
                          onChange={e => setClassificacaoMotivo(e.target.value)}
                          rows={4}
                          placeholder="Motivo determinado pela IA para esta classificação..."
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-slate-300 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preferences and Search Filters */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">
                      🎯 Preferências de Interesse
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Orçamento ({lead?.moeda || 'BRL'})</label>
                        <div className="relative">
                          <IoCashOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="number" 
                            value={orcamento}
                            onChange={e => setOrcamento(e.target.value)}
                            placeholder="Valor"
                            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Finalidade</label>
                        <select 
                          value={finalidade}
                          onChange={e => setFinalidade(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
                        >
                          <option value="">Qualquer</option>
                          <option value="comprar">Comprar</option>
                          <option value="alugar">Alugar</option>
                          <option value="investir">Investir</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Tipo de Imóvel</label>
                        <select 
                          value={tipoInteresse}
                          onChange={e => setTipoInteresse(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
                        >
                          <option value="">Qualquer</option>
                          <option value="apartamento">Apartamento</option>
                          <option value="casa">Casa</option>
                          <option value="terreno">Terreno</option>
                          <option value="loja">Comercial</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Bairros (Vírgula)</label>
                        <input 
                          type="text" 
                          value={bairros}
                          onChange={e => setBairros(e.target.value)}
                          placeholder="Centro, Morumbi"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Quartos Mínimos</label>
                        <input 
                          type="number" 
                          value={quartos}
                          onChange={e => setQuartos(e.target.value)}
                          placeholder="Ex: 3"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Vagas Mínimas</label>
                        <input 
                          type="number" 
                          value={vagas}
                          onChange={e => setVagas(e.target.value)}
                          placeholder="Ex: 2"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Área Mínima (m²)</label>
                        <input 
                          type="number" 
                          value={area}
                          onChange={e => setArea(e.target.value)}
                          placeholder="Ex: 80"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Descrição do Interesse</label>
                        <textarea 
                          value={descricaoInteresse}
                          onChange={e => setDescricaoInteresse(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-slate-300 resize-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Observações do Corretor</label>
                        <textarea 
                          value={observacoes}
                          onChange={e => setObservacoes(e.target.value)}
                          rows={3}
                          placeholder="Insira anotações privadas sobre a negociação..."
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-slate-300 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={savingFicha}
                      className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary hover:shadow-lg transition-all shadow-md disabled:opacity-50"
                    >
                      {savingFicha ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: TIMELINE / AGENDA */}
              {activeTab === 'timeline' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Timeline list */}
                  <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <span>⏳</span> Histórico & Compromissos
                    </h3>

                    {loadingEvents ? (
                      <div className="space-y-4">
                        <div className="h-16 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse" />
                        <div className="h-16 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse" />
                      </div>
                    ) : events.length === 0 ? (
                      <div className="bg-slate-50 rounded-2xl p-8 border border-dashed border-slate-200 text-center text-slate-400">
                        <p className="text-3xl mb-2 opacity-35">📆</p>
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum compromisso agendado para este cliente.</p>
                      </div>
                    ) : (
                      <div className="relative border-l border-slate-100 pl-6 ml-4 space-y-6">
                        {events.map((event) => (
                          <div key={event.id} className="relative group">
                            {/* Dot indicator */}
                            <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-white ring-4 ring-primary/10 shadow-sm" />
                            
                            <div className="bg-white border border-slate-100 hover:border-slate-200 p-5 rounded-2xl shadow-sm transition-all">
                              <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                  <span>
                                    {event.tipo === 'visita' ? '🏠' : 
                                     event.tipo === 'reuniao' ? '🤝' : 
                                     event.tipo === 'assinatura' ? '✍️' : 
                                     event.tipo === 'vistoria' ? '🔍' : '📌'}
                                  </span>
                                  {event.titulo}
                                </h4>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  event.status === 'realizado' ? 'bg-emerald-50 text-emerald-700' :
                                  event.status === 'cancelado' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {event.status}
                                </span>
                              </div>

                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <IoTimeOutline size={12} />
                                  {new Date(event.data_hora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {event.local && (
                                  <span className="flex items-center gap-1">
                                    <IoLocationOutline size={12} />
                                    {event.local}
                                  </span>
                                )}
                              </p>

                              {event.descricao && (
                                <p className="text-slate-600 text-xs leading-relaxed border-t border-slate-50 pt-2 font-medium">
                                  {event.descricao}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Event Form */}
                  <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 self-start space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <span>➕</span> Novo Agendamento
                    </h3>
                    
                    <form onSubmit={handleAddEvent} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Título</label>
                        <input 
                          type="text"
                          required
                          value={newEvent.titulo}
                          onChange={e => setNewEvent({ ...newEvent, titulo: e.target.value })}
                          placeholder="Ex: Visita ao Swiss Park"
                          className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Tipo</label>
                          <select 
                            value={newEvent.tipo}
                            onChange={e => setNewEvent({ ...newEvent, tipo: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
                          >
                            <option value="visita">Visita</option>
                            <option value="reuniao">Reunião</option>
                            <option value="assinatura">Assinatura</option>
                            <option value="vistoria">Vistoria</option>
                            <option value="outro">Outro</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Data / Hora</label>
                          <input 
                            type="datetime-local"
                            required
                            value={newEvent.data_hora}
                            onChange={e => setNewEvent({ ...newEvent, data_hora: e.target.value })}
                            className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Local</label>
                        <input 
                          type="text"
                          value={newEvent.local}
                          onChange={e => setNewEvent({ ...newEvent, local: e.target.value })}
                          placeholder="Ex: Swiss Park, Lote 45 ou Escritório"
                          className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Descrição</label>
                        <textarea 
                          value={newEvent.descricao}
                          onChange={e => setNewEvent({ ...newEvent, descricao: e.target.value })}
                          placeholder="Detalhes sobre a visita ou notas adicionais..."
                          rows={3}
                          className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingEvent}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all disabled:opacity-50"
                      >
                        <IoCalendarOutline size={14} />
                        {submittingEvent ? 'Agendando...' : 'Agendar & Notificar'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 3: WHATSAPP CHAT */}
              {activeTab === 'chat' && (
                <div className="border border-slate-100 rounded-[2rem] shadow-sm flex flex-col h-[550px] overflow-hidden bg-slate-50/50">
                  {/* Chat Header */}
                  <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                      {lead?.nome.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">{lead?.nome}</h4>
                      <p className="text-[9px] text-emerald-500 font-black uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> WhatsApp Ativo
                      </p>
                    </div>
                  </div>

                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-100/30 flex flex-col">
                    {loadingMessages && messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full space-y-2">
                        <div className="w-6 h-6 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Carregando conversa...</span>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="my-auto text-center p-8 text-slate-400">
                        <p className="text-4xl mb-2 opacity-30">💬</p>
                        <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Nenhuma mensagem registrada.<br/>Envie uma mensagem abaixo para iniciar.</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isInbound = msg.direction === 'inbound';
                        const isAudio = msg.media_type === 'audio';
                        return (
                          <div 
                            key={msg.id} 
                            className={`flex flex-col max-w-[70%] ${isInbound ? 'self-start' : 'self-end items-end'}`}
                          >
                            <div className={`p-4 rounded-3xl shadow-sm text-xs leading-relaxed font-bold ${
                              isInbound 
                                ? 'bg-white text-slate-800 rounded-tl-none border border-slate-100' 
                                : 'bg-emerald-500 text-white rounded-tr-none'
                            }`}>
                              {/* Audio Message */}
                              {isAudio ? (
                                <div className="space-y-2 min-w-[200px]">
                                  <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest opacity-80">
                                    <IoMicOutline size={14} />
                                    <span>Mensagem de Voz ({msg.duracao_segundos || 0}s)</span>
                                  </div>
                                  
                                  {msg.media_url ? (
                                    <audio src={msg.media_url} controls className="w-full max-w-[220px] h-8 accent-emerald-600" />
                                  ) : (
                                    <div className="w-full h-8 bg-slate-50/50 rounded flex items-center px-2 text-[9px] text-slate-400 select-none">
                                      🎙️ Áudio recebido no WhatsApp
                                    </div>
                                  )}

                                  {msg.transcricao && (
                                    <div className={`p-2.5 rounded-xl text-[11px] leading-snug italic font-medium ${
                                      isInbound ? 'bg-slate-50 border border-slate-100 text-slate-600' : 'bg-emerald-600 text-emerald-50'
                                    }`}>
                                      &ldquo;{msg.transcricao}&rdquo;
                                    </div>
                                  )}
                                </div>
                              ) : (
                                /* Text Message */
                                <p className="whitespace-pre-line">{msg.message_text}</p>
                              )}
                            </div>

                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1 px-1.5">
                              {new Date(msg.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-2 shrink-0 items-center">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Digite uma mensagem..."
                      className="flex-1 px-5 py-3 border border-slate-100 bg-slate-50 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-emerald-300"
                    />
                    <button 
                      type="submit"
                      disabled={sendingMessage || !chatInput.trim()}
                      className="p-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white rounded-2xl shadow-md transition-all shrink-0 flex items-center justify-center"
                    >
                      <IoSendOutline size={16} />
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 4: RECOMMENDED MATCHES */}
              {activeTab === 'matches' && (
                <ImoveisMatchPanel 
                  lead={lead!} 
                  matchingImoveis={matchingImoveis} 
                  loading={loadingMatches} 
                  onRefresh={fetchMatches} 
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
