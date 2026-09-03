'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  IoAlertCircle, 
  IoQrCodeOutline, 
  IoSyncOutline, 
  IoWarningOutline, 
  IoChevronForwardOutline,
  IoRefreshOutline 
} from 'react-icons/io5';

interface WhatsAppStatusData {
  whatsapp_status?: string;
  whatsapp_instance?: string | null;
  whatsapp_number?: string | null;
}

export function WhatsAppHealthBanner() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchStatus = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/corretores/me/preferences', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data: WhatsAppStatusData = await res.json();
        setStatus(data.whatsapp_status || 'close');
      } else {
        // Fallback check on imobiliaria endpoint
        const imobRes = await fetch('/api/imobiliaria', { cache: 'no-store' });
        if (imobRes.ok) {
          const imobData = await imobRes.json();
          setStatus(imobData.whatsapp_status || 'close');
        } else {
          setStatus('close');
        }
      }
    } catch {
      setStatus('close');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Polling leve a cada 30 segundos
    const interval = setInterval(() => {
      fetchStatus();
    }, 30000);

    // Revalidar status ao focar na aba
    const handleFocus = () => fetchStatus();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchStatus]);

  // Se ainda estiver carregando pela primeira vez ou se o WhatsApp estiver conectado ('open'), não exibe o banner
  if (loading || status === 'open') {
    return null;
  }

  const isConnecting = status === 'connecting';

  return (
    <aside 
      aria-label="Alerta de Conexão WhatsApp"
      className="relative z-40 bg-gradient-to-r from-rose-950 via-amber-950 to-rose-950 text-white border-b border-rose-500/30 shadow-lg px-4 py-2.5 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Left: Indicator + Message */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex items-center justify-center shrink-0">
            <span className={`absolute inline-flex h-3.5 w-3.5 rounded-full ${isConnecting ? 'bg-amber-400' : 'bg-rose-500'} opacity-75 animate-ping`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnecting ? 'bg-amber-500' : 'bg-rose-500'}`} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isConnecting ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black uppercase tracking-wider text-[10px]">
                <IoSyncOutline className="animate-spin text-xs" /> Conectando
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 font-black uppercase tracking-wider text-[10px]">
                <IoAlertCircle className="text-xs" /> Desconectado
              </span>
            )}

            <p className="font-medium text-slate-100 text-xs leading-relaxed">
              {isConnecting ? (
                <>
                  <strong className="text-amber-300 font-bold">Instância do WhatsApp Conectando</strong> — Aguardando autenticação e sincronização.
                </>
              ) : (
                <>
                  <strong className="text-rose-300 font-bold">⚠️ Instância do WhatsApp Desconectada</strong> — As respostas automáticas da IA e notificações estão pausadas.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <button
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            title="Atualizar status de conexão"
            className="p-1.5 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-xs disabled:opacity-50 flex items-center gap-1 font-semibold"
          >
            <IoRefreshOutline className={`text-sm ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline text-[10px] uppercase tracking-wider">Checar</span>
          </button>

          <Link
            href="/admin/config"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-bold text-xs shadow-md hover:shadow-emerald-900/30 transition-all transform active:scale-95 whitespace-nowrap"
          >
            <IoQrCodeOutline className="text-sm" />
            <span>🔗 Reconectar QR Code</span>
            <IoChevronForwardOutline className="text-[10px] opacity-70" />
          </Link>
        </div>

      </div>
    </aside>
  );
}
