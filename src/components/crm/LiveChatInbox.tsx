'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  IoLogoWhatsapp,
  IoSendOutline,
  IoMicOutline,
  IoSearchOutline,
  IoRefreshOutline,
  IoSparklesOutline,
  IoCheckmarkDoneOutline,
  IoCheckmarkOutline,
  IoPersonOutline,
  IoTimeOutline,
  IoHomeOutline,
  IoHandRightOutline,
  IoPlayOutline,
  IoPauseOutline,
  IoCopyOutline,
  IoFlashOutline,
  IoChatbubblesOutline,
  IoCloseOutline,
  IoWarningOutline
} from 'react-icons/io5';
import type { LeadComCorretor } from '@/lib/database.types';

export interface ChatMessage {
  id: string;
  lead_id: string;
  direction: 'inbound' | 'outbound';
  message_text: string;
  media_type?: string;
  media_url?: string | null;
  transcricao?: string | null;
  transcricao_confianca?: number | null;
  duracao_segundos?: number | null;
  is_bot?: boolean;
  status?: string;
  criado_em: string;
}

export interface LiveChatInboxProps {
  initialLeadId?: string | null;
  leads?: LeadComCorretor[];
  onSelectLead?: (lead: LeadComCorretor) => void;
  isDrawerMode?: boolean;
  leadOverride?: LeadComCorretor | null;
}

export function LiveChatInbox({
  initialLeadId,
  leads = [],
  onSelectLead,
  isDrawerMode = false,
  leadOverride = null
}: LiveChatInboxProps) {
  // Leads list and active lead state
  const [leadList, setLeadList] = useState<LeadComCorretor[]>(leads);
  const [selectedLead, setSelectedLead] = useState<LeadComCorretor | null>(leadOverride);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingList, setLoadingList] = useState(false);

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Human Handoff / AI State
  const [isHumanHandoff, setIsHumanHandoff] = useState(false);
  const [togglingHandoff, setTogglingHandoff] = useState(false);

  // AI Copilot state
  const [showCopilot, setShowCopilot] = useState(false);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotAction, setCopilotAction] = useState<string>('convidar_visita');
  const [copilotSuggestions, setCopilotSuggestions] = useState<string[]>([]);
  const [customInstructions, setCustomInstructions] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch leads if not provided or to refresh
  const fetchLeads = useCallback(async () => {
    if (isDrawerMode && leadOverride) return;
    try {
      setLoadingList(true);
      const res = await fetch('/api/clientes?limit=50');
      if (res.ok) {
        const result = await res.json();
        const items = result.data || [];
        setLeadList(items);
        if (!selectedLead && items.length > 0) {
          const match = initialLeadId ? items.find((l: any) => l.id === initialLeadId) : items[0];
          setSelectedLead(match || items[0]);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar lista de leads do chat:', e);
    } finally {
      setLoadingList(false);
    }
  }, [initialLeadId, isDrawerMode, leadOverride, selectedLead]);

  useEffect(() => {
    if (leadOverride) {
      setSelectedLead(leadOverride);
    } else if (leads.length > 0) {
      setLeadList(leads);
      if (!selectedLead) {
        const match = initialLeadId ? leads.find(l => l.id === initialLeadId) : leads[0];
        setSelectedLead(match || leads[0]);
      }
    } else {
      fetchLeads();
    }
  }, [leadOverride, leads, initialLeadId, fetchLeads, selectedLead]);

  // Fetch Messages for active lead
  const fetchMessages = useCallback(async () => {
    if (!selectedLead?.id) return;
    try {
      const res = await fetch(`/api/leads/${selectedLead.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data || []);
      }
    } catch (e) {
      console.error('Erro ao buscar mensagens:', e);
    }
  }, [selectedLead?.id]);

  // Fetch Handoff State for active lead
  const fetchHandoffState = useCallback(async () => {
    if (!selectedLead?.id) return;
    try {
      const res = await fetch(`/api/leads/${selectedLead.id}/handoff`);
      if (res.ok) {
        const data = await res.json();
        setIsHumanHandoff(!!data.is_human_handoff);
      }
    } catch (e) {
      console.error('Erro ao buscar estado do handoff:', e);
    }
  }, [selectedLead?.id]);

  // Load active lead conversation
  useEffect(() => {
    if (selectedLead?.id) {
      setLoadingMessages(true);
      Promise.all([fetchMessages(), fetchHandoffState()]).finally(() => {
        setLoadingMessages(false);
      });
    }
  }, [selectedLead?.id, fetchMessages, fetchHandoffState]);

  // Polling for incoming WhatsApp messages every 5s
  useEffect(() => {
    if (!selectedLead?.id) return;
    const interval = setInterval(() => {
      fetchMessages();
      fetchHandoffState();
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedLead?.id, fetchMessages, fetchHandoffState]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMessages]);

  // Send WhatsApp Message
  async function handleSendMessage(e?: React.FormEvent, textOverride?: string) {
    if (e) e.preventDefault();
    const textToSend = (textOverride || chatInput).trim();
    if (!textToSend || !selectedLead?.id || sendingMessage) return;

    setSendingMessage(true);
    try {
      const res = await fetch(`/api/leads/${selectedLead.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend })
      });

      if (res.ok) {
        if (!textOverride) setChatInput('');
        toast.success('Mensagem enviada com sucesso!');

        // Add local optimistic bubble
        const localMsg: ChatMessage = {
          id: `opt-${Date.now()}`,
          lead_id: selectedLead.id,
          direction: 'outbound',
          message_text: textToSend,
          media_type: 'text',
          status: 'sent',
          criado_em: new Date().toISOString()
        };
        setMessages(prev => [...prev, localMsg]);
        fetchMessages();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erro ao enviar mensagem');
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro de conexão ao enviar WhatsApp');
    } finally {
      setSendingMessage(false);
    }
  }

  // Toggle Human Handoff (Assumir / Reativar IA)
  async function handleToggleHandoff(action: 'assume' | 'reactivate') {
    if (!selectedLead?.id || togglingHandoff) return;
    setTogglingHandoff(true);
    try {
      const res = await fetch(`/api/leads/${selectedLead.id}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (res.ok) {
        const isNowHandoff = action === 'assume';
        setIsHumanHandoff(isNowHandoff);
        toast.success(
          isNowHandoff
            ? 'Atendimento assumido! Respostas automáticas da IA pausadas por 24h.'
            : 'IA Reativada! O robô voltou a qualificar e responder o lead.'
        );
      } else {
        toast.error('Erro ao alternar modo de atendimento');
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro de conexão ao alterar estado da conversa');
    } finally {
      setTogglingHandoff(false);
    }
  }

  // Generate AI Copilot Suggestions
  async function handleGenerateCopilot(actionType: string) {
    if (!selectedLead?.id || copilotLoading) return;
    setCopilotLoading(true);
    setCopilotAction(actionType);
    setShowCopilot(true);

    try {
      const res = await fetch('/api/ai/copilot-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          action_type: actionType,
          custom_instructions: actionType === 'custom' ? customInstructions : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCopilotSuggestions(data.suggestions || []);
        toast.success('Sugestões geradas pela IA!');
      } else {
        toast.error('Erro ao gerar sugestões de IA');
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro de conexão com o Copilot de IA');
    } finally {
      setCopilotLoading(false);
    }
  }

  // Helper to copy text
  function handleCopyText(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  }

  // Helper to test if message is a property recommendation
  function isPropertyCardMessage(text: string): boolean {
    if (!text) return false;
    return (
      (text.includes('🔗 Ver detalhes:') || text.includes('Ref:') || text.includes('🏠 *')) &&
      (text.includes('R$') || text.includes('💰') || text.includes('quarto') || text.includes('vaga'))
    );
  }

  // Helper to parse property card lines
  function parsePropertyCardDetails(text: string) {
    const titleMatch = text.match(/🏠\s*\*(.*?)\*/i) || text.match(/\*1️⃣\s*(.*?)\*/i) || text.match(/\*(.*?)\*/);
    const valueMatch = text.match(/(?:💰|Valor:)\s*(R\$\s*[\d.,]+)/i);
    const linkMatch = text.match(/🔗\s*Ver detalhes:\s*(\S+)/i) || text.match(/(https?:\/\/\S+)/i);
    const refMatch = text.match(/Ref:\s*([A-Za-z0-9\-_]+)/i);
    const specsMatch = text.match(/(?:🛏️|Quartos:|📐|Área:)([\s\S]*?)(?=\n|$)/i);

    return {
      title: titleMatch ? titleMatch[1] : 'Imóvel em Destaque',
      value: valueMatch ? valueMatch[1] : null,
      link: linkMatch ? linkMatch[1] : null,
      ref: refMatch ? refMatch[1] : null,
      specs: specsMatch ? specsMatch[0] : null
    };
  }

  const filteredLeads = leadList.filter(l => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.nome?.toLowerCase().includes(term) ||
      l.telefone?.includes(term) ||
      l.classificacao?.toLowerCase().includes(term)
    );
  });

  return (
    <div className={`flex bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden ${isDrawerMode ? 'h-[620px]' : 'h-[750px]'} w-full text-slate-100 font-sans`}>
      {/* LEFT SIDEBAR: ACTIVE CONVERSATIONS LIST (Hidden in compact Drawer mode if single lead) */}
      {!isDrawerMode && (
        <div className="w-80 md:w-96 border-r border-slate-800 flex flex-col bg-slate-950/70 shrink-0">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <IoLogoWhatsapp size={20} />
              </div>
              <div>
                <h3 className="font-black text-xs text-white uppercase tracking-wider">Live Chat CRM</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">WhatsApp Ativo</p>
              </div>
            </div>
            <button
              onClick={fetchLeads}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-800"
              title="Atualizar Conversas"
            >
              <IoRefreshOutline size={16} />
            </button>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-slate-800/80">
            <div className="relative">
              <IoSearchOutline className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar conversa ou telefone..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 placeholder:text-slate-500 outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-800/40">
            {loadingList && leadList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Carregando chats...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <IoChatbubblesOutline size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              filteredLeads.map(lead => {
                const isSelected = selectedLead?.id === lead.id;
                return (
                  <div
                    key={lead.id}
                    onClick={() => {
                      setSelectedLead(lead);
                      if (onSelectLead) onSelectLead(lead);
                    }}
                    className={`p-4 transition-all cursor-pointer flex items-center gap-3.5 group relative ${
                      isSelected
                        ? 'bg-slate-800/90 border-l-4 border-l-emerald-500'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs uppercase shadow-md transition-all ${
                        isSelected ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700'
                      }`}>
                        {lead.nome ? lead.nome.charAt(0).toUpperCase() : '?'}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
                        <IoLogoWhatsapp size={8} className="text-white" />
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4 className="text-xs font-black text-white truncate group-hover:text-emerald-400 transition-colors">
                          {lead.nome}
                        </h4>
                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                          {lead.criado_em ? new Date(lead.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 truncate font-medium">
                        {lead.descricao_interesse || lead.telefone}
                      </p>

                      <div className="flex items-center gap-1.5 mt-1.5">
                        {lead.classificacao && (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[8px] font-black uppercase tracking-wider border border-slate-700">
                            {lead.classificacao.replace('_', ' ')}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                          lead.status === 'fechado' ? 'bg-emerald-500/20 text-emerald-400' :
                          lead.status === 'em_atendimento' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {lead.status?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* RIGHT MAIN AREA: ACTIVE CHAT CONVERSATION */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
        {/* Chat Top Header */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm border border-emerald-500/30 shadow-inner">
              {selectedLead?.nome ? selectedLead.nome.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white tracking-tight">
                  {selectedLead?.nome || 'Selecione um cliente'}
                </h3>
                {selectedLead?.classificacao && (
                  <span className="px-2 py-0.5 bg-slate-800 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider">
                    {selectedLead.classificacao.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-bold flex items-center gap-2 mt-0.5">
                <span className="text-emerald-400 flex items-center gap-1 font-mono">
                  <IoLogoWhatsapp size={11} /> {selectedLead?.telefone}
                </span>
                {selectedLead?.orcamento && (
                  <span>• R$ {Number(selectedLead.orcamento).toLocaleString('pt-BR')}</span>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons: Assumir / Reativar IA + Copilot Toggle */}
          <div className="flex items-center gap-2">
            {/* Status Indicator */}
            <div className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${
              isHumanHandoff 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isHumanHandoff ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
              {isHumanHandoff ? 'Humano no Controle (IA Pausada)' : 'Robô IA Respondendo'}
            </div>

            {/* Toggle Handoff Button */}
            {isHumanHandoff ? (
              <button
                onClick={() => handleToggleHandoff('reactivate')}
                disabled={togglingHandoff}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-900/30"
                title="Reativa as respostas automáticas da IA para este lead"
              >
                <IoFlashOutline size={13} />
                {togglingHandoff ? 'Reativando...' : 'Reativar IA'}
              </button>
            ) : (
              <button
                onClick={() => handleToggleHandoff('assume')}
                disabled={togglingHandoff}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-amber-600 hover:text-white disabled:opacity-50 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-slate-700"
                title="Pausa a IA por 24h para você conversar manualmente"
              >
                <IoHandRightOutline size={13} className="text-amber-400" />
                {togglingHandoff ? 'Pausando...' : 'Assumir Conversa'}
              </button>
            )}

            {/* Copilot Open Button */}
            <button
              onClick={() => setShowCopilot(prev => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                showCopilot 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/40' 
                  : 'bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border-indigo-700/50'
              }`}
            >
              <IoSparklesOutline size={13} className="text-indigo-400 animate-spin-slow" />
              Copilot IA
            </button>
          </div>
        </div>

        {/* AI Copilot Drawer Banner (Collapsible) */}
        {showCopilot && (
          <div className="bg-slate-900/95 border-b border-indigo-500/20 p-5 space-y-4 animate-fade-in z-10 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-black uppercase tracking-wider">
                <IoSparklesOutline size={16} className="text-indigo-400" />
                <span>Copilot de Mensagens de Alta Conversão</span>
              </div>
              <button
                onClick={() => setShowCopilot(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <IoCloseOutline size={18} />
              </button>
            </div>

            {/* Quick action buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'proposta', label: '📄 Proposta / Fechamento', icon: '💰' },
                { id: 'follow_up_visita', label: '🤝 Follow-up Visita', icon: '🏡' },
                { id: 'quebra_objecao', label: '🛡️ Quebra de Objeção', icon: '💡' },
                { id: 'convidar_visita', label: '☕ Convidar Visita / Café', icon: '📅' }
              ].map(act => (
                <button
                  key={act.id}
                  onClick={() => handleGenerateCopilot(act.id)}
                  disabled={copilotLoading}
                  className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all text-left flex items-center gap-2 ${
                    copilotAction === act.id && copilotSuggestions.length > 0
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-900/50'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span className="text-sm">{act.icon}</span>
                  <span className="truncate">{act.label}</span>
                </button>
              ))}
            </div>

            {/* Generated suggestions list */}
            {copilotLoading ? (
              <div className="p-6 bg-slate-950/80 rounded-2xl border border-slate-800 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-indigo-400 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
                  Criando 3 opções persuasivas com IA baseadas no perfil do cliente...
                </p>
              </div>
            ) : copilotSuggestions.length > 0 ? (
              <div className="space-y-2.5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Opções Prontas para Envio (Clique para Enviar ou Copiar):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {copilotSuggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-950/90 border border-slate-800 hover:border-indigo-500/40 rounded-2xl flex flex-col justify-between space-y-3 group transition-all"
                    >
                      <p className="text-xs text-slate-200 leading-relaxed font-medium whitespace-pre-line">
                        {sug}
                      </p>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
                        <button
                          onClick={() => handleCopyText(sug)}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 border border-slate-800"
                        >
                          <IoCopyOutline size={12} /> Copiar
                        </button>
                        <button
                          onClick={() => setChatInput(sug)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors border border-slate-700"
                        >
                          Usar no Chat
                        </button>
                        <button
                          onClick={() => handleSendMessage(undefined, sug)}
                          disabled={sendingMessage}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm"
                        >
                          <IoSendOutline size={12} /> Enviar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Message Thread Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900/60">
          {loadingMessages && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Carregando histórico do WhatsApp...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="my-auto text-center p-12 text-slate-600">
              <IoChatbubblesOutline size={48} className="mx-auto mb-3 opacity-30 text-emerald-500" />
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Nenhuma mensagem registrada</h4>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto font-medium">
                Envie uma mensagem abaixo ou use o Copilot de IA para dar o primeiro passo no WhatsApp com este cliente.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isInbound = msg.direction === 'inbound';
              const isAudio = msg.media_type === 'audio';
              const isPropertyCard = isPropertyCardMessage(msg.message_text);

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${
                    isInbound ? 'self-start items-start' : 'self-end items-end'
                  }`}
                >
                  <div
                    className={`p-4 rounded-3xl text-xs leading-relaxed font-bold shadow-md transition-all ${
                      isInbound
                        ? 'bg-slate-800/90 text-slate-100 rounded-tl-none border border-slate-700/60 shadow-slate-950/50'
                        : 'bg-emerald-600 text-white rounded-tr-none shadow-emerald-950/40'
                    }`}
                  >
                    {/* AUDIO MESSAGE PLAYER */}
                    {isAudio ? (
                      <div className="space-y-2.5 min-w-[240px]">
                        <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-wider opacity-90 pb-1 border-b border-white/10">
                          <span className="flex items-center gap-1.5">
                            <IoMicOutline size={15} /> Mensagem de Áudio
                          </span>
                          <span>{msg.duracao_segundos || 0}s</span>
                        </div>

                        {msg.media_url ? (
                          <audio
                            src={msg.media_url}
                            controls
                            className="w-full h-8 rounded-lg accent-emerald-400"
                          />
                        ) : (
                          <div className="w-full h-9 bg-black/20 rounded-xl flex items-center px-3 gap-2 text-[10px] text-white/80 select-none">
                            <IoMicOutline size={14} className="text-emerald-300" />
                            <span>Gravação de voz recebida via WhatsApp</span>
                          </div>
                        )}

                        {/* Whisper Transcription */}
                        {msg.transcricao && (
                          <div className={`p-3 rounded-2xl text-[11px] leading-relaxed italic font-medium ${
                            isInbound ? 'bg-slate-900/80 border border-slate-700 text-slate-300' : 'bg-emerald-700 text-emerald-50'
                          }`}>
                            &ldquo;{msg.transcricao}&rdquo;
                          </div>
                        )}
                      </div>
                    ) : isPropertyCard ? (
                      /* PROPERTY RECOMMENDATION CARD */
                      <div className="space-y-3 min-w-[260px] max-w-md">
                        {(() => {
                          const card = parsePropertyCardDetails(msg.message_text);
                          return (
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider pb-1.5 border-b border-white/20">
                                <IoHomeOutline size={14} />
                                <span>Recomendação de Imóvel</span>
                                {card.ref && <span className="ml-auto opacity-70">Ref: {card.ref}</span>}
                              </div>

                              <div className="bg-black/20 p-3.5 rounded-2xl space-y-1.5 border border-white/10">
                                <h4 className="font-black text-sm text-white">{card.title}</h4>
                                {card.value && (
                                  <p className="text-xs font-black text-amber-300">{card.value}</p>
                                )}
                                <p className="text-[11px] opacity-90 whitespace-pre-line font-medium">
                                  {msg.message_text}
                                </p>
                              </div>

                              {card.link && (
                                <a
                                  href={card.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                >
                                  Ver Ficha do Imóvel ↗
                                </a>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      /* STANDARD TEXT MESSAGE */
                      <p className="whitespace-pre-line font-medium leading-relaxed">
                        {msg.message_text}
                      </p>
                    )}
                  </div>

                  {/* Message timestamp and indicators */}
                  <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-1 px-2">
                    {msg.is_bot && (
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <IoFlashOutline size={9} /> IA
                      </span>
                    )}
                    <span>
                      {msg.criado_em ? new Date(msg.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    {!isInbound && (
                      <IoCheckmarkDoneOutline size={12} className="text-emerald-400" />
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Chat Input Form */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 bg-slate-900/95 border-t border-slate-800 flex items-center gap-3 shrink-0"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={
                selectedLead
                  ? `Enviar WhatsApp para ${selectedLead.nome}...`
                  : 'Selecione um cliente para conversar...'
              }
              disabled={!selectedLead || sendingMessage}
              className="w-full pl-5 pr-12 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition-all disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowCopilot(prev => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 rounded-xl transition-all"
              title="Abrir Copilot de IA"
            >
              <IoSparklesOutline size={16} />
            </button>
          </div>

          <button
            type="submit"
            disabled={!chatInput.trim() || !selectedLead || sendingMessage}
            className="p-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-900/40 transition-all shrink-0 flex items-center justify-center cursor-pointer"
          >
            <IoSendOutline size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
