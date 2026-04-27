'use client';

import { useState, useEffect, useCallback } from 'react';
import { IoNotificationsOutline, IoCheckmarkDoneOutline, IoTimeOutline, IoInformationCircleOutline, IoPersonAddOutline, IoCashOutline, IoCalendarOutline } from 'react-icons/io5';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'sistema' | 'lead' | 'financeiro' | 'agenda';
  link?: string;
  lida: boolean;
  criado_em: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notificacoes');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Polling básico (poderia ser Supabase Realtime)
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.lida).length;

  async function markAsRead(id?: string) {
    try {
      const res = await fetch('/api/notificacoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : { all: true }),
      });
      if (res.ok) {
        if (id) {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
        } else {
          setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
        }
      }
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  }

  const getIcon = (tipo: Notification['tipo']) => {
    switch (tipo) {
      case 'lead': return <IoPersonAddOutline className="text-blue-500" />;
      case 'financeiro': return <IoCashOutline className="text-green-500" />;
      case 'agenda': return <IoCalendarOutline className="text-amber-500" />;
      default: return <IoInformationCircleOutline className="text-slate-500" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all group"
      >
        <IoNotificationsOutline size={20} className="text-slate-600 group-hover:text-primary transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-[2rem] shadow-2xl border border-slate-100 z-50 overflow-hidden animate-scale-in origin-top-right">
            <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Notificações</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={() => markAsRead()}
                  className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1"
                >
                  <IoCheckmarkDoneOutline size={14} />
                  Ler todas
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-4xl mb-3 opacity-20">🔔</p>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">Tudo limpo por aqui!<br/>Nenhuma notificação nova.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => {
                        if (!n.lida) markAsRead(n.id);
                        if (n.link) window.location.href = n.link;
                      }}
                      className={`p-5 flex gap-4 hover:bg-slate-50 transition-all cursor-pointer relative group ${!n.lida ? 'bg-primary/5' : ''}`}
                    >
                      <div className="shrink-0 w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-lg shadow-sm">
                        {getIcon(n.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug mb-1 ${!n.lida ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>
                          {n.titulo}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-2 font-medium">
                          {n.mensagem}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          <IoTimeOutline size={12} />
                          {formatDistanceToNow(new Date(n.criado_em), { addSuffix: true, locale: ptBR })}
                        </div>
                      </div>
                      {!n.lida && (
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-50 bg-slate-50/30 text-center">
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
