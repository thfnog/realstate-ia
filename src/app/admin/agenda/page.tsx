import { useState, useEffect } from 'react';
import { IoCalendarOutline, IoChevronBackOutline, IoChevronForwardOutline, IoSyncOutline, IoTrashOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoCreateOutline, IoLocationOutline, IoPersonOutline, IoBriefcaseOutline } from 'react-icons/io5';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import WhatsAppConnector from '@/components/corretores/WhatsAppConnector';
import { getConfig } from '@/lib/countryConfig';

const eventConfig: Record<string, { label: string, color: string, bg: string, icon: string }> = {
  visita: { label: 'Visita', color: 'text-primary', bg: 'bg-primary/10 border-primary/20', icon: '🏠' },
  reuniao: { label: 'Reunião', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100', icon: '🤝' },
  vistoria: { label: 'Vistoria', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', icon: '🔍' },
  assinatura: { label: 'Assinatura', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', icon: '✍️' },
  outro: { label: 'Outro', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-100', icon: '📅' },
};

export default function AgendaPage() {
  const config = getConfig();
  const [eventos, setEventos] = useState<any[]>([]);
  const [escala, setEscala] = useState<any[]>([]);
  const [corretores, setCorretores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modoEscala, setModoEscala] = useState(false);
  const [selectedCorretorId, setSelectedCorretorId] = useState('');
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editData, setEditData] = useState<any>({});

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
      if (Array.isArray(corData)) setCorretores(corData.filter((c: any) => c.ativo));
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

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

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function getEventsForDay(day: number) {
    const targetDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return eventos.filter(e => e.data_hora.startsWith(targetDateStr));
  }

  function formatTime(isoStr: string) {
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  async function updateEventStatus(id: string, newStatus: string) {
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
    <div className="animate-fade-in flex flex-col h-[calc(100vh-2rem)] space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Agenda Operacional</h1>
          <p className="text-slate-500 font-medium mt-1">Acompanhamento centralizado de visitas, vistorias e contratos.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="p-4 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-primary hover:shadow-lg transition-all"
            title="Atualizar Dados"
          >
            <IoSyncOutline size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 flex-1 flex flex-col min-h-0 shadow-2xl shadow-slate-200/50">
        {/* Calendar Header Controls */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 shrink-0 gap-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight lg:w-72">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex items-center bg-slate-50 p-1.5 rounded-[1.25rem] border border-slate-100 w-fit shadow-sm">
              <button onClick={handlePrevMonth} className="p-2.5 rounded-xl hover:bg-white hover:text-primary transition-all text-slate-400">
                <IoChevronBackOutline size={20} />
              </button>
              <button onClick={handleToday} className="px-6 py-2 rounded-xl hover:bg-white text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all mx-1">Hoje</button>
              <button onClick={handleNextMonth} className="p-2.5 rounded-xl hover:bg-white hover:text-primary transition-all text-slate-400">
                <IoChevronForwardOutline size={20} />
              </button>
            </div>
            
            <div className={`flex items-center gap-4 px-6 py-2 border-slate-100 transition-all lg:border-l ${modoEscala ? 'bg-primary/5 rounded-2xl ring-2 ring-primary/10' : ''}`}>
              <label className="flex items-center gap-3 cursor-pointer group select-none shrink-0">
                <div className={`w-12 h-6 bg-slate-200 rounded-full relative transition-all duration-500 ${modoEscala ? '!bg-primary' : ''}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-500 shadow-sm ${modoEscala ? 'left-7' : 'left-1'}`}></div>
                </div>
                <input 
                  type="checkbox" 
                  checked={modoEscala} 
                  onChange={(e) => setModoEscala(e.target.checked)} 
                  className="hidden" 
                />
                <span className={`text-[10px] font-black uppercase tracking-widest ${modoEscala ? 'text-primary' : 'text-slate-400'}`}>
                  Escala de Corretores
                </span>
              </label>
              
              {modoEscala && (
                <div className="animate-fade-in flex flex-wrap items-center gap-4">
                  {corretores.length > 1 ? (
                    <select
                      value={selectedCorretorId}
                      onChange={(e) => setSelectedCorretorId(e.target.value)}
                      className="px-6 py-2 rounded-xl border-2 border-primary/20 bg-white text-[10px] font-black uppercase tracking-widest text-slate-900 focus:ring-4 focus:ring-primary/10 outline-none shadow-sm min-w-[220px]"
                    >
                      <option value="">Selecione o Consultor...</option>
                      {corretores.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} {c.whatsapp_status === 'close' ? ' (OFF)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-3 px-6 py-2 bg-white rounded-xl border-2 border-primary/20 shadow-sm">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">✨ Foco: {corretores[0]?.nome}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {!modoEscala && (
            <div className="flex flex-wrap gap-4 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
              {Object.entries(eventConfig).map(([key, conf]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${conf.bg.split(' ')[0]} border ${conf.bg.split(' ')[1]}`}></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{conf.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 min-h-0 flex flex-col border border-slate-100 rounded-[2rem] overflow-hidden bg-slate-50/30">
          <div className="min-w-[1000px] flex-1 flex flex-col h-full overflow-x-auto">
            {/* Days Header */}
            <div className="grid grid-cols-7 bg-white border-b border-slate-100 shrink-0">
              {daysOfWeek.map((day, idx) => (
                <div key={day} className={`px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest ${idx > 0 ? 'border-l border-slate-50' : ''}`}>
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Body */}
            <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto custom-scrollbar">
              {/* Empty boxes for offset */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className={`bg-slate-50/20 border-b border-slate-100 ${i > 0 ? 'border-l border-slate-50' : ''}`} />
              ))}
              
              {/* Actual Days */}
              {loading ? (
                Array.from({ length: daysInMonth }).map((_, i) => (
                  <div key={`skeleton-${i}`} className="p-4 border-b border-slate-100 border-l border-slate-50 bg-white animate-pulse">
                    <LoadingSkeleton className="w-8 h-8 rounded-full mb-4" />
                    <LoadingSkeleton className="h-4 w-full rounded-lg mb-2" />
                    <LoadingSkeleton className="h-4 w-3/4 rounded-lg" />
                  </div>
                ))
              ) : Array.from({ length: daysInMonth }).map((_, i) => {
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
                    className={`group relative p-4 flex flex-col border-b border-slate-100 bg-white ${colIdx > 0 ? 'border-l border-slate-50' : ''} ${modoEscala ? 'cursor-pointer hover:bg-primary/5 active:scale-[0.98]' : 'hover:bg-slate-50/30'} transition-all duration-300`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      {/* Escala Badges */}
                      <div className="flex flex-wrap gap-1.5 items-start flex-1 min-w-0 pr-2">
                        {escalaHoje.map(esc => {
                          const init = esc.corretores?.nome.substring(0, 2).toUpperCase() || '??';
                          return (
                            <div 
                              key={esc.id}
                              title={esc.corretores?.nome}
                              onClick={(e) => { 
                                if (modoEscala) { e.stopPropagation(); toggleEscalaDia(dayStr, esc.corretor_id); }
                              }}
                              className={`flex items-center justify-center w-7 h-7 text-[9px] font-black rounded-xl border-2 shrink-0 transition-all ${modoEscala ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 hover:bg-rose-500 hover:border-rose-500 scale-110' : 'bg-slate-50 text-slate-500 border-slate-100 group-hover:border-slate-200'}`}
                            >
                              {init}
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* Day Number */}
                      <div className="shrink-0">
                        <span className={`inline-flex items-center justify-center w-9 h-9 text-xs font-black tracking-tighter rounded-2xl transition-all ${isToday ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-110' : 'text-slate-900 group-hover:scale-110'}`}>
                          {day}
                        </span>
                      </div>
                    </div>
                    
                    <div className={`flex-1 space-y-2 pr-1 transition-all duration-500 ${modoEscala ? 'opacity-20 pointer-events-none blur-[1px]' : ''}`}>
                      {dayEvents.map(evt => {
                        const ec = eventConfig[evt.tipo] || eventConfig.outro;
                        return (
                          <div 
                            key={evt.id} 
                            onClick={() => setSelectedEvent(evt)}
                            className={`flex flex-col px-3 py-2.5 rounded-xl border shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all ${ec.bg} ${evt.status === 'realizado' ? 'opacity-50' : ''}`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-900/60">{formatTime(evt.data_hora)}</span>
                              {evt.status === 'agendado' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                              )}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest leading-tight line-clamp-1 ${ec.color}`}>{evt.titulo}</span>
                            {evt.lead && <span className="text-[9px] font-bold text-slate-500 mt-1 line-clamp-1">{evt.lead.nome}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                );
              })}
              
              {/* Trailing empty boxes */}
              {Array.from({ length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7 }).map((_, i) => (
                <div key={`trail-${i}`} className={`bg-slate-50/20 border-b border-slate-100 border-l border-slate-50`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-6" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col animate-scale-in border border-white/20" onClick={e => e.stopPropagation()}>
            <div className={`px-10 py-10 border-b border-slate-50 ${eventConfig[selectedEvent.tipo]?.bg.split(' ')[0]} relative`}>
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-black/5 bg-white/40 shadow-sm`}>
                  {eventConfig[selectedEvent.tipo]?.label}
                </span>
                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-black/5 bg-white/40 shadow-sm`}>
                  {selectedEvent.status}
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {selectedEvent.titulo}
              </h2>
              <button onClick={() => setSelectedEvent(null)} className="absolute top-10 right-10 p-3 text-slate-500 hover:text-slate-900 hover:bg-white/50 rounded-2xl transition-all">
                <IoCloseCircleOutline size={28} />
              </button>
            </div>
            
            <div className="p-10 space-y-10">
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data e Horário</p>
                  {editMode ? (
                    <input 
                      type="datetime-local"
                      value={editData.data_hora ? editData.data_hora.substring(0, 16) : ''}
                      onChange={(e) => setEditData({ ...editData, data_hora: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    />
                  ) : (
                    <div className="flex items-center gap-3 text-slate-900">
                      <IoCalendarOutline className="text-primary text-xl" />
                      <p className="text-sm font-black uppercase tracking-widest">
                        {new Date(selectedEvent.data_hora).toLocaleDateString('pt-BR')} <span className="text-primary">•</span> {formatTime(selectedEvent.data_hora)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Operacional</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${selectedEvent.status === 'agendado' ? 'bg-blue-500' : selectedEvent.status === 'realizado' ? 'bg-emerald-500' : 'bg-red-500'} shadow-lg`}></div>
                    <p className="text-sm font-black uppercase tracking-widest text-slate-900">{selectedEvent.status}</p>
                  </div>
                </div>
              </div>

              {selectedEvent.lead && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Interessado / Lead</p>
                  <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm">
                      <IoPersonOutline size={24} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-slate-900 tracking-tight">{selectedEvent.lead.nome}</p>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-1">{selectedEvent.lead.telefone}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Consultor Responsável</p>
                  <div className="flex items-center gap-4 text-slate-900">
                    <IoBriefcaseOutline className="text-emerald-500 text-xl" />
                    <p className="text-sm font-black uppercase tracking-widest">{selectedEvent.corretor?.nome || 'NÃO ATRIBUÍDO'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Localização</p>
                  {editMode ? (
                    <input 
                      type="text"
                      value={editData.local || ''}
                      onChange={(e) => setEditData({ ...editData, local: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    />
                  ) : (
                    <div className="flex items-center gap-4 text-slate-900">
                      <IoLocationOutline className="text-indigo-500 text-xl" />
                      <p className="text-sm font-black uppercase tracking-widest line-clamp-1">{selectedEvent.local || 'A DEFINIR'}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas do Atendimento</p>
                {editMode ? (
                  <textarea 
                    value={editData.descricao || ''}
                    onChange={(e) => setEditData({ ...editData, descricao: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 px-8 py-6 rounded-[2rem] text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all min-h-[120px]"
                  />
                ) : (
                  <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 border-l-4 border-l-primary/30">
                    <p className="text-sm text-slate-700 font-medium italic leading-relaxed">
                      {selectedEvent.descricao || 'Sem observações adicionais para este registro.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <button 
                onClick={() => deleteEvent(selectedEvent.id)}
                disabled={updating}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-all disabled:opacity-30"
              >
                <IoTrashOutline size={18} /> Excluir Registro
              </button>
              
              <div className="flex gap-4">
                {!editMode && (
                  <button 
                    onClick={() => setEditMode(true)}
                    disabled={updating}
                    className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-900 hover:border-primary hover:text-primary transition-all shadow-sm"
                  >
                    <IoCreateOutline size={18} /> Editar Dados
                  </button>
                )}
                
                {editMode ? (
                  <button 
                    onClick={saveEventChanges}
                    disabled={updating}
                    className="px-10 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-slate-900/10"
                  >
                    {updating ? 'Sincronizando...' : 'Confirmar Alterações'}
                  </button>
                ) : (
                  <div className="flex gap-3">
                    {selectedEvent.status !== 'cancelado' && (
                      <button 
                        onClick={() => updateEventStatus(selectedEvent.id, 'cancelado')}
                        disabled={updating}
                        className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-all shadow-sm"
                      >
                        <IoCloseCircleOutline size={18} /> Cancelar
                      </button>
                    )}
                    {selectedEvent.status === 'agendado' && (
                      <button 
                        onClick={() => updateEventStatus(selectedEvent.id, 'realizado')}
                        disabled={updating}
                        className="flex items-center gap-2 px-10 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-slate-900/10"
                      >
                        <IoCheckmarkCircleOutline size={18} /> Marcar Realizado
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
