'use client';

import { useEffect, useState } from 'react';
import type { EventoComDetalhes, StatusEvento, TipoEvento, EscalaComCorretor, Corretor } from '@/lib/database.types';
import { getConfig } from '@/lib/countryConfig';

const eventConfig: Record<TipoEvento, { label: string; color: string; bg: string }> = {
  visita: { label: 'Visita', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-200' },
  assinatura: { label: 'Assinatura', color: 'text-purple-700', bg: 'bg-purple-100 border-purple-200' },
  cartorio: { label: 'Cartório', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200' },
  reuniao: { label: 'Reunião', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' },
  vistoria: { label: 'Vistoria', color: 'text-indigo-700', bg: 'bg-indigo-100 border-indigo-200' },
  outro: { label: 'Outro', color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200' },
};

export default function AgendaPage() {
  const config = getConfig();
  const [eventos, setEventos] = useState<EventoComDetalhes[]>([]);
  const [escala, setEscala] = useState<EscalaComCorretor[]>([]);
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Escala Mode
  const [modoEscala, setModoEscala] = useState(false);
  const [selectedCorretorId, setSelectedCorretorId] = useState('');
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<EventoComDetalhes | null>(null);
  
  // Edit State
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<EventoComDetalhes>>({});

  useEffect(() => {
    if (selectedEvent) {
      setEditData(selectedEvent);
      setEditMode(false);
    }
  }, [selectedEvent]);

  async function saveEventChanges() {
    if (!selectedEvent) return;
    try {
      setUpdating(true);
      const res = await fetch(`/api/eventos/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      const updated = await res.json();
      if (res.ok) {
        setEventos(eventos.map(e => e.id === updated.id ? { ...e, ...updated } : e));
        setSelectedEvent({ ...selectedEvent, ...updated });
        setEditMode(false);
      } else {
        alert('Erro ao salvar: ' + (updated.error || 'Erro desconhecido'));
      }
    } catch (err) {
      alert('Erro ao salvar alterações');
    } finally {
      setUpdating(false);
    }
  }

  async function fetchData() {
    try {
      setLoading(true);
      // Fetch Eventos, Escala, and Corretores basically in parallel for the MVP unifier
      const [evtRes, escRes, corRes] = await Promise.all([
        fetch('/api/eventos'),
        fetch('/api/escala'),
        fetch('/api/corretores')
      ]);
      const evtData = await evtRes.json();
      const escData = await escRes.json();
      const corData = await corRes.json();
      
      if (Array.isArray(evtData)) setEventos(evtData);
      if (Array.isArray(escData)) setEscala(escData);
      if (Array.isArray(corData)) setCorretores(corData.filter((c: Corretor) => c.ativo));
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-select corretor if only one exists
  useEffect(() => {
    if (corretores.length === 1 && !selectedCorretorId) {
      setSelectedCorretorId(corretores[0].id);
    }
  }, [corretores, selectedCorretorId]);

  function handlePrevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function handleNextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  function handleToday() {
    setCurrentDate(new Date());
  }

  // Generate Calendar Grid
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Helper to get events for a specific day
  function getEventsForDay(day: number) {
    const targetDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return eventos.filter(e => e.data_hora.startsWith(targetDateStr));
  }

  // Format time (HH:MM)
  function formatTime(isoStr: string) {
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  async function updateEventStatus(id: string, newStatus: StatusEvento) {
    try {
      setUpdating(true);
      await fetch(`/api/eventos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (selectedEvent && selectedEvent.id === id) {
        setSelectedEvent({ ...selectedEvent, status: newStatus });
      }
      fetchData();
    } catch (err) {
      alert('Erro ao atualizar evento');
    } finally {
      setUpdating(false);
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm('Deseja realmente excluir este evento?')) return;
    try {
      setUpdating(true);
      await fetch(`/api/eventos/${id}`, { method: 'DELETE' });
      setSelectedEvent(null);
      fetchData();
    } catch (err) {
      alert('Erro ao excluir evento');
    } finally {
      setUpdating(false);
    }
  }

  // Escala Handlers
  function getEscalaForDay(targetDateStr: string) {
    return escala.filter(e => e.data === targetDateStr);
  }

  async function toggleEscalaDia(dayStr: string, cId: string) {
    if (!modoEscala) return;
    if (!cId) {
      alert('Selecione primeiro qual corretor deseja alocar no dropdown "Modo Escala" superior.');
      return;
    }
    
    try {
      setUpdating(true);
      const existente = getEscalaForDay(dayStr).find(e => e.corretor_id === cId);
      if (existente) {
        await fetch(`/api/escala?id=${existente.id}`, { method: 'DELETE' });
      } else {
        await fetch('/api/escala', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ corretor_id: cId, data: dayStr }),
        });
      }
      fetchData();
    } catch (err) {
      alert('Erro ao atualizar escala');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-2rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 shrink-0 gap-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Agenda & Processos</h1>
          <p className="text-text-secondary text-sm mt-1">Acompanhamento de visitas, assinaturas e cartório.</p>
        </div>
        <div className="flex gap-2 self-end sm:self-auto">
          <button 
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-border-light bg-white text-text-secondary hover:text-primary hover:bg-primary-subtle transition-all"
            title="Atualizar"
          >
            ↻
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border-light p-4 flex-1 flex flex-col min-h-0">
        {/* Calendar Header Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 shrink-0 gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 sm:w-48">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex items-center bg-surface-alt rounded-lg p-1 w-fit">
              <button onClick={handlePrevMonth} className="px-3 py-1 rounded hover:bg-white text-slate-600 font-medium">←</button>
              <button onClick={handleToday} className="px-4 py-1 rounded hover:bg-white text-slate-800 font-medium text-sm">Hoje</button>
              <button onClick={handleNextMonth} className="px-3 py-1 rounded hover:bg-white text-slate-600 font-medium">→</button>
            </div>
            
            {/* NOVO: MODO ESCALA TOGGLE E SELECTOR */}
            <div className={`flex items-center gap-3 px-2 py-1 border-border-light text-sm transition-all sm:border-l ${modoEscala ? 'bg-primary-subtle rounded-lg' : ''}`}>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-primary select-none shrink-0">
                <div className={`w-8 h-4 bg-slate-300 rounded-full relative transition-colors ${modoEscala ? '!bg-primary' : ''}`}>
                  <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${modoEscala ? 'left-[18px]' : 'left-0.5'}`}></div>
                </div>
                <input 
                  type="checkbox" 
                  checked={modoEscala} 
                  onChange={(e) => setModoEscala(e.target.checked)} 
                  className="hidden" 
                />
                Escala
              </label>
              
              {modoEscala && (
                <div className="animate-fade-in flex flex-wrap items-center gap-2">
                  <select
                    value={selectedCorretorId}
                    onChange={(e) => setSelectedCorretorId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border-2 border-primary/40 bg-white text-xs text-text-primary focus:outline-none focus:border-primary shadow-sm min-w-[180px]"
                  >
                    <option value="">+ Escolher corretor...</option>
                    {corretores.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.whatsapp_status === 'close' ? '⚠️ ' : ''}
                        {c.nome}
                      </option>
                    ))}
                  </select>
                  <span className="hidden xl:inline text-[10px] font-black text-primary uppercase animate-pulse">
                    ✨ Clique nos dias
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {!modoEscala && (
            <div className="flex flex-wrap gap-3 text-xs">
              {Object.entries(eventConfig).map(([key, conf]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded-full ${conf.bg.split(' ')[0]} border ${conf.bg.split(' ')[1]}`}></span>
                  <span className="text-slate-600">{conf.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 min-h-0 flex flex-col border border-border-light rounded-xl overflow-x-auto bg-surface-alt/30 overscroll-none scrollbar-thin">
          <div className="min-w-[700px] flex-1 flex flex-col h-full">
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-border-light bg-surface-alt shrink-0">
            {daysOfWeek.map((day, idx) => (
              <div key={day} className={`p-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider ${idx > 0 ? 'border-l border-border-light' : ''}`}>
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Body */}
          <div className="flex-1 grid grid-cols-7 auto-rows-fr">
            {/* Empty boxes for offset */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className={`p-2 border-b border-border-light bg-slate-50/50 ${i > 0 ? 'border-l border-border-light' : ''}`} />
            ))}
            
            {/* Actual Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = 
                day === new Date().getDate() && 
                currentDate.getMonth() === new Date().getMonth() && 
                currentDate.getFullYear() === new Date().getFullYear();
              
              const dayEvents = getEventsForDay(day);
              const colIdx = (firstDayOfMonth + i) % 7;
              
              const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const escalaHoje = getEscalaForDay(dayStr);
              
              return (
                <div 
                  key={day} 
                  onClick={() => modoEscala && toggleEscalaDia(dayStr, selectedCorretorId)}
                  className={`p-1 flex flex-col border-b border-border-light bg-white ${colIdx > 0 ? 'border-l border-border-light' : ''} ${modoEscala ? 'cursor-pointer hover:bg-primary-subtle border border-transparent hover:border-primary/30 z-10' : 'hover:bg-slate-50/50'} transition-all`}
                >
                  <div className="flex items-start justify-between mb-1.5 p-1">
                    {/* Escala Badges rendering */}
                    <div className="flex flex-wrap gap-1 items-start flex-1 min-w-0 pr-1">
                      {escalaHoje.map(esc => {
                        const init = esc.corretores?.nome.substring(0, 2).toUpperCase() || 'NA';
                        return (
                          <div 
                            key={esc.id}
                            title={esc.corretores?.nome}
                            onClick={(e) => { 
                              if (modoEscala) { e.stopPropagation(); toggleEscalaDia(dayStr, esc.corretor_id); }
                            }}
                            className={`flex items-center justify-center w-6 h-6 text-[9px] font-bold rounded-full border shrink-0 ${modoEscala ? 'bg-primary text-white border-primary-hover shadow-sm hover:bg-danger hover:border-danger hover:text-white' : 'bg-surface-alt text-slate-600 border-slate-200'} transition-colors`}
                          >
                            {init}
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Day Number */}
                    <div className="shrink-0">
                      <span className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full ${isToday ? 'bg-primary text-white font-bold' : 'text-slate-700'}`}>
                        {day}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1 transition-opacity ${modoEscala ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                    {loading ? null : dayEvents.map(evt => {
                      const ec = eventConfig[evt.tipo] || eventConfig.outro;
                      return (
                        <div 
                          key={evt.id} 
                          onClick={() => setSelectedEvent(evt)}
                          title={`${evt.titulo}\n${evt.lead?.nome || ''}\n${evt.local || ''}`}
                          className={`flex flex-col px-2 py-1.5 rounded-lg border text-xs cursor-pointer hover:brightness-95 transition-all ${ec.bg} ${evt.status === 'realizado' ? 'opacity-60 line-through' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-0.5 gap-1">
                            <span className="font-semibold truncate text-slate-800">{formatTime(evt.data_hora)}</span>
                            {evt.status === 'agendado' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0 animate-pulse"></span>
                            )}
                          </div>
                          <span className={`font-medium truncate ${ec.color}`}>{evt.titulo}</span>
                          {evt.lead && <span className="truncate text-slate-600 mt-0.5">{evt.lead.nome}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
            
            {/* Trailing empty boxes */}
            {Array.from({ length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7 }).map((_, i) => (
              <div key={`trail-${i}`} className={`p-2 border-b border-border-light bg-slate-50/50 border-l border-border-light`} />
            ))}
          </div>
        </div>
      </div>
    </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className={`p-5 border-b ${eventConfig[selectedEvent.tipo]?.bg.split(' ')[0]} flex justify-between items-start`}>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1 block">
                  {eventConfig[selectedEvent.tipo]?.label}
                </span>
                <h2 className="text-lg font-bold text-slate-800 leading-tight">
                  {selectedEvent.titulo}
                </h2>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-1 text-slate-400 hover:text-slate-700 bg-white/50 hover:bg-white rounded-lg transition-colors">
                ✕
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Data e Hora</p>
                  {editMode ? (
                    <input 
                      type="datetime-local"
                      value={editData.data_hora ? editData.data_hora.substring(0, 16) : ''}
                      onChange={(e) => setEditData({ ...editData, data_hora: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-primary rounded"
                    />
                  ) : (
                    <p className="font-semibold text-slate-800">
                      {new Date(selectedEvent.data_hora).toLocaleDateString('pt-BR')} às {formatTime(selectedEvent.data_hora)}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Status</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${selectedEvent.status === 'agendado' ? 'bg-blue-500' : selectedEvent.status === 'realizado' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    <span className="font-semibold text-slate-800 capitalize">{selectedEvent.status}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Assunto</p>
                  {editMode ? (
                    <input 
                      type="text"
                      value={editData.titulo || ''}
                      onChange={(e) => setEditData({ ...editData, titulo: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-primary rounded"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-800">{selectedEvent.titulo}</p>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Tipo</p>
                  {editMode ? (
                    <select
                      value={editData.tipo || 'outro'}
                      onChange={(e) => setEditData({ ...editData, tipo: e.target.value as TipoEvento })}
                      className="w-full px-2 py-1 text-sm border border-primary rounded"
                    >
                      {Object.entries(eventConfig).map(([key, conf]) => (
                        <option key={key} value={key}>{conf.label}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm font-medium text-slate-800">{eventConfig[selectedEvent.tipo]?.label}</p>
                  )}
                </div>
              </div>

              {selectedEvent.lead && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-1">Cliente / Origem</p>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      👤
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">{selectedEvent.lead.nome}</p>
                      <p className="text-xs text-slate-500">{selectedEvent.lead.telefone}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-1">Corretor Responsável</p>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                    💼
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {selectedEvent.corretor?.nome || 'Não atribuído'}
                    </p>
                    {selectedEvent.corretor?.telefone && (
                      <p className="text-xs text-slate-500">{selectedEvent.corretor.telefone}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-0.5">Local</p>
                {editMode ? (
                  <input 
                    type="text"
                    value={editData.local || ''}
                    onChange={(e) => setEditData({ ...editData, local: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-primary rounded"
                  />
                ) : (
                  <p className="text-sm text-slate-700 flex items-start gap-1">
                    📍 {selectedEvent.local || 'A combinar'}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-0.5">Observações</p>
                {editMode ? (
                  <textarea 
                    value={editData.descricao || ''}
                    onChange={(e) => setEditData({ ...editData, descricao: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-primary rounded h-20"
                  />
                ) : (
                  <p className="text-sm text-slate-700 italic border-l-2 border-slate-200 pl-3">
                    {selectedEvent.descricao || 'Sem observações'}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button 
                onClick={() => deleteEvent(selectedEvent.id)}
                disabled={updating}
                className="text-xs text-danger font-medium hover:underline disabled:opacity-50"
              >
                Excluir
              </button>
              
              <div className="flex gap-2">
                {!editMode && (
                  <button 
                    onClick={() => setEditMode(true)}
                    disabled={updating}
                    className="px-3 py-1.5 rounded-lg border border-primary text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
                
                {editMode ? (
                  <button 
                    onClick={saveEventChanges}
                    disabled={updating}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-hover disabled:opacity-50"
                  >
                    {updating ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                ) : (
                  <>
                    {selectedEvent.status !== 'cancelado' && (
                      <button 
                        onClick={() => updateEventStatus(selectedEvent.id, 'cancelado')}
                        disabled={updating}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      >
                        Marcar Cancelado
                      </button>
                    )}
                    {selectedEvent.status === 'agendado' && (
                      <button 
                        onClick={() => updateEventStatus(selectedEvent.id, 'realizado')}
                        disabled={updating}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Marcar Realizado
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
