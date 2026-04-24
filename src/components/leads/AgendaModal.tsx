import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { LeadComCorretor, StatusLead, Evento, TipoEvento, Corretor } from '@/lib/database.types';
import { statusConfig } from './KanbanBoard';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface AgendaModalProps {
  selectedLead: LeadComCorretor;
  setSelectedLead: (lead: LeadComCorretor | null) => void;
  leadEventos: Evento[];
  loadingEventos: boolean;
  leadMessages: any[];
  loadingMessages: boolean;
  matchingImoveis: any[];
  loadingMatching: boolean;
  newEvent: { tipo: TipoEvento; titulo: string; descricao: string; data_hora: string; local: string; corretor_id: string };
  setNewEvent: (evt: any) => void;
  handleCreateEvent: (e: React.FormEvent) => void;
  sendingMsg: boolean;
  msgStatus: 'idle' | 'success' | 'error';
  setSendingMsg: (val: boolean) => void;
  setMsgStatus: (val: 'idle' | 'success' | 'error') => void;
  updateStatus: (id: string, status: StatusLead) => void;
  corretores: Corretor[];
}

export function AgendaModal({
  selectedLead,
  setSelectedLead,
  leadEventos,
  loadingEventos,
  leadMessages,
  loadingMessages,
  matchingImoveis,
  loadingMatching,
  newEvent,
  setNewEvent,
  handleCreateEvent,
  sendingMsg,
  msgStatus,
  setSendingMsg,
  setMsgStatus,
  updateStatus,
  corretores
}: AgendaModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [leadMessages]);
  
  async function handleSendMessage() {
    const area = document.getElementById('manualMsg') as HTMLTextAreaElement;
    const msg = area?.value;
    if (!msg || sendingMsg) return;
    
    setSendingMsg(true);
    setMsgStatus('idle');
    try {
      const res = await fetch(`/api/leads/${selectedLead.id}/message`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ message: msg })
      });
      if (res.ok) {
        setMsgStatus('success');
        toast.success('Mensagem enviada com sucesso');
        area.value = '';
        
        // Auto-move to "Em Atendimento" if it was "Novo"
        if (selectedLead.status === 'novo') {
           updateStatus(selectedLead.id, 'em_atendimento');
        }

        // Trigger message list refresh by some event or just wait for next poll
        // In a real app, we might want to push the message to the local list
      } else {
        setMsgStatus('error');
        toast.error('Erro no envio da mensagem');
      }
    } catch {
      setMsgStatus('error');
      toast.error('Erro no envio da mensagem');
    } finally {
      setSendingMsg(false);
      setTimeout(() => setMsgStatus('idle'), 3000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelectedLead(null)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
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
        
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left col: Event history & Match */}
          <div className="flex-1 p-6 border-r border-border-light bg-slate-50/30 overflow-y-auto">
            
             {/* 📩 MENSAGEM ORIGINAL DO CLIENTE */}
             {selectedLead.descricao_interesse && (
               <div className="mb-8 p-4 rounded-xl bg-amber-50/50 border border-amber-200/50 shadow-sm">
                 <h3 className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                   <span>📩</span> Resumo da Solicitação
                 </h3>
                 {selectedLead.imoveis && (
                    <div className="mb-3 p-3 bg-white rounded-lg border border-amber-100 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xl">🏠</div>
                          <div>
                             <p className="text-[10px] font-black text-primary uppercase">Imóvel de Interesse</p>
                             <p className="text-sm font-bold text-text-primary">{selectedLead.imoveis.referencia} — {selectedLead.imoveis.titulo}</p>
                          </div>
                       </div>
                       <Link 
                         href={`/admin/imoveis/${selectedLead.imovel_id}`}
                         className="px-3 py-1.5 bg-primary text-white text-[10px] font-black uppercase rounded-lg hover:bg-primary-hover transition-all"
                       >
                          Ver Imóvel
                       </Link>
                    </div>
                 )}
                 <p className="text-sm text-amber-800 italic leading-relaxed">
                   "{selectedLead.descricao_interesse}"
                 </p>
               </div>
             )}

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
                <p className="text-sm text-text-secondary">Nenhum agendamento registrado.</p>
              </div>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {leadEventos.map((evt) => (
                  <div key={evt.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <span className="text-lg">{evt.tipo === 'visita' ? '🏠' : evt.tipo === 'assinatura' ? '✍️' : evt.tipo === 'cartorio' ? '🏛️' : '📌'}</span>
                    </div>
                    
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

            {/* 🏠 SUGGESTED PROPERTIES SECTION */}
            <div className="mt-10 pt-10 border-t border-border-light">
              <h3 className="font-semibold text-text-primary mb-5 flex items-center gap-2">
                <span>🏠</span> Imóveis Sugeridos (Match)
              </h3>
              
              {loadingMatching ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                   {[1,2].map(i => <div key={i} className="min-w-[200px] h-32 bg-slate-100 rounded-2xl animate-pulse"></div>)}
                </div>
              ) : matchingImoveis.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-border-light rounded-xl text-center">
                  <p className="text-[10px] text-text-muted uppercase tracking-widest">Nenhum imóvel combina com o perfil exato</p>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide">
                  {matchingImoveis.map(imob => {
                    const scorePercentage = Math.min(100, ((imob.score || 0) / 15) * 100).toFixed(0);
                    return (
                      <div key={imob.id} className="min-w-[260px] max-w-[260px] p-4 bg-white rounded-2xl border border-border-light shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        {/* Match Score Badge */}
                        <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-primary text-white text-[9px] font-black rounded-lg shadow-lg">
                           {scorePercentage}% MATCH
                        </div>

                        <div className="h-24 rounded-xl overflow-hidden mb-3">
                           <img 
                             src={imob.fotos?.[0]?.url_media || 'https://placehold.co/400x300?text=ImobIA'} 
                             className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" 
                             alt="Imóvel"
                           />
                        </div>
                        <h4 className="text-xs font-bold text-text-primary truncate">{imob.titulo}</h4>
                        <p className="text-[10px] text-primary font-black mt-1">{(imob.valor / 1000).toFixed(0)}k • {imob.freguesia}</p>
                        
                        {/* Score Breakdown (Small dots or text) */}
                        <div className="mt-3 flex flex-wrap gap-1">
                           {imob.scoreBreakdown?.slice(0, 3).map((b: string, idx: number) => (
                             <span key={idx} className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                               {b.split(':')[0]}
                             </span>
                           ))}
                        </div>

                        <Link 
                          href={`/admin/imoveis/${imob.id}`}
                          className="mt-4 block text-center py-2.5 rounded-xl bg-surface-alt text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all border border-border-light/50"
                        >
                          Ver Imóvel
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right col: WhatsApp Chat & New Event Form */}
          <div className="md:w-[400px] bg-slate-50 shrink-0 flex flex-col border-l border-border-light">
            
            {/* 💬 WHATSAPP CHAT (ADMIN -> LEAD) */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 bg-white border-b border-border-light flex items-center justify-between">
                <h3 className="font-bold text-text-primary flex items-center gap-2 text-sm uppercase tracking-tight">
                  <span>💬</span> Conversa WhatsApp
                </h3>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Evolution API Online"></span>
              </div>

              {/* Message List */}
              <div 
                ref={scrollRef}
                className="flex-1 p-4 overflow-y-auto space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-fixed"
              >
                {loadingMessages ? (
                   <div className="flex justify-center py-10"><div className="animate-spin text-2xl">⏳</div></div>
                ) : leadMessages.length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-indigo-100 text-center mx-4">
                    <p className="text-xs text-text-secondary">Nenhuma mensagem registrada no histórico.</p>
                  </div>
                ) : (
                  leadMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm ${
                        msg.direction === 'outbound' 
                          ? 'bg-emerald-100 text-emerald-950 rounded-tr-none' 
                          : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.message_text}</p>
                        <p className="text-[9px] mt-1 opacity-50 text-right">
                          {new Date(msg.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {msg.direction === 'outbound' && ' ✓'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-border-light">
                <div className="flex flex-wrap gap-1 mb-3">
                   {[
                     { label: 'Opa, podemos falar?', text: `Oi ${selectedLead.nome}, vi seu interesse no ImobIA. Podemos conversar rapidinho?` },
                     { label: 'Agendar Visita', text: `Olá ${selectedLead.nome}, quando você teria disponibilidade para conhecer o imóvel pessoalmente?` },
                     { label: 'Enviar Fotos', text: `Oi ${selectedLead.nome}, vou te mandar as fotos e a planta do imóvel que você gostou agora mesmo!` },
                   ].map((q, i) => (
                     <button 
                       key={i}
                       onClick={() => {
                         const area = document.getElementById('manualMsg') as HTMLTextAreaElement;
                         if (area) area.value = q.text;
                       }}
                       className="text-[9px] font-bold px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-600 hover:bg-primary hover:text-white hover:border-primary transition-all"
                     >
                       {q.label}
                     </button>
                   ))}
                </div>
                
                <div className="flex gap-2">
                  <textarea 
                    id="manualMsg"
                    placeholder="Sua mensagem..."
                    rows={2}
                    className="flex-1 text-sm px-3 py-2 rounded-xl border border-border bg-slate-50 focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={sendingMsg}
                    className={`px-4 rounded-xl font-bold text-white transition-all shadow-md ${
                      msgStatus === 'success' ? 'bg-emerald-500 shadow-emerald-100' :
                      msgStatus === 'error' ? 'bg-red-500 shadow-red-100' :
                      'bg-slate-900 hover:bg-slate-800 shadow-slate-100'
                    } disabled:opacity-50`}
                  >
                    {sendingMsg ? '⏳' : msgStatus === 'success' ? '✅' : msgStatus === 'error' ? '❌' : '🚀'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border-light">
              <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2 text-xs uppercase tracking-tight">
                <span>➕</span> Novo Agendamento
              </h3>
              
              <form onSubmit={handleCreateEvent} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Tipo</label>
                    <select 
                      value={newEvent.tipo} 
                      onChange={e => setNewEvent({...newEvent, tipo: e.target.value as TipoEvento})}
                      className="w-full text-xs p-2 rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="visita">🏠 Visita</option>
                      <option value="reuniao">🤝 Reunião</option>
                      <option value="assinatura">✍️ Assinatura</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Data/Hora</label>
                    <input 
                      type="datetime-local" 
                      required
                      value={newEvent.data_hora}
                      onChange={e => setNewEvent({...newEvent, data_hora: e.target.value})}
                      className="w-full text-xs p-2 rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
                
                <input 
                  type="text" 
                  required
                  placeholder="Título (ex: Visita local)"
                  value={newEvent.titulo}
                  onChange={e => setNewEvent({...newEvent, titulo: e.target.value})}
                  className="w-full text-xs p-2 rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary/20 outline-none"
                />

                <button 
                  type="submit" 
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] transition-all uppercase tracking-widest"
                >
                  Agendar Evento
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
