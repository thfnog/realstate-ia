'use client';

import { useState, useEffect, useCallback } from 'react';
import { IoLogoWhatsapp, IoSync, IoCloseCircle, IoCheckmarkCircle, IoQrCodeOutline } from 'react-icons/io5';

interface WhatsAppConnectorProps {
  instanceName: string;
  brokerId?: string; // ID do corretor no banco de dados
  onStatusChange?: (status: string) => void;
}

export default function WhatsAppConnector({ instanceName, brokerId, onStatusChange }: WhatsAppConnectorProps) {
  const [status, setStatus] = useState<string>('checking');
  const [lastSavedStatus, setLastSavedStatus] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/whatsapp/instance?instance=${instanceName}`);
      const data = await res.json();
      
      // Evolution API v2 structure: instance.state
      const state = data.instance?.state || data.state || 'close';
      
      setStatus(state);
      if (onStatusChange) onStatusChange(state);
      
      // PERSISTÊNCIA: Se o status mudou (ou é o primeiro check) e temos um ID de corretor, salvar no banco
      if (brokerId && state !== lastSavedStatus) {
        try {
          await fetch(`/api/corretores/${brokerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ whatsapp_status: state })
          });
          setLastSavedStatus(state);
        } catch (dbErr) {
          console.error('Erro ao persistir status no banco:', dbErr);
        }
      }

      if (state === 'open') {
        setQrCode(null);
        setPolling(false);
      }
    } catch (err) {
      console.error('Erro ao checar status:', err);
    }
  }, [instanceName, brokerId, onStatusChange, lastSavedStatus]);

  // Efeito para checar status inicial
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Efeito de polling enquanto o QR code estiver aberto
  useEffect(() => {
    let interval: any;
    if (polling) {
      interval = setInterval(checkStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [polling, checkStatus]);

  async function handleConnect() {
    setLoading(true);
    setQrCode(null);
    try {
      const res = await fetch('/api/whatsapp/instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName, action: 'connect' })
      });
      const data = await res.json();
      
      if (data.base64) {
        setQrCode(data.base64);
        setPolling(true);
      } else {
        alert('Erro ao gerar QR Code. Tente novamente.');
      }
    } catch (err) {
      alert('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (!confirm('Desconectar este WhatsApp?')) return;
    setLoading(true);
    try {
      await fetch(`/api/whatsapp/instance?instance=${instanceName}`, { method: 'DELETE' });
      setStatus('close');
      setQrCode(null);
      setPolling(false);
    } catch (err) {
      alert('Erro ao desconectar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface-alt rounded-2xl p-6 border border-border-light">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${status === 'open' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
            <IoLogoWhatsapp size={24} />
          </div>
          <div>
            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">Conexão WhatsApp</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
               {status === 'checking' ? (
                 <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                   <IoSync className="animate-spin" /> CHECANDO...
                 </span>
               ) : status === 'open' ? (
                 <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                   <IoCheckmarkCircle /> CONECTADO
                 </span>
               ) : (
                 <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500">
                   <IoCloseCircle /> DESCONECTADO
                 </span>
               )}
            </div>
          </div>
        </div>

        {status === 'open' ? (
          <button 
            onClick={handleLogout}
            disabled={loading}
            className="text-rose-600 text-xs font-bold hover:underline disabled:opacity-50"
          >
            Sair da conta
          </button>
        ) : (
          <button 
            onClick={handleConnect}
            disabled={loading || polling}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm shadow-emerald-200 disabled:opacity-50"
          >
            {loading ? 'Gerando...' : polling ? 'Aguardando Scan...' : 'Conectar Agora'}
          </button>
        )}
      </div>

      {qrCode && (
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-border-light animate-fade-in">
          <div className="relative p-2 bg-white border-2 border-emerald-500/20 rounded-lg shadow-inner mb-4">
             <img src={qrCode} alt="QR Code WhatsApp" className="w-48 h-48" />
             {loading && (
               <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                 <IoSync size={32} className="text-emerald-500 animate-spin" />
               </div>
             )}
          </div>
          <p className="text-[11px] text-text-secondary text-center leading-relaxed">
            Abra o WhatsApp no seu celular,<br /> 
            vá em <strong>Aparelhos Conectados</strong> e escaneie o código.
          </p>
          <button 
            onClick={() => { setQrCode(null); setPolling(false); }}
            className="mt-4 text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase"
          >
            Cancelar
          </button>
        </div>
      )}

      {status === 'open' && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2 text-emerald-700">
           <IoCheckmarkCircle size={18} />
           <p className="text-[11px] font-medium">As mensagens deste corretor serão enviadas automaticamente por este número.</p>
        </div>
      )}

      {!qrCode && status !== 'open' && (
        <div className="p-4 border-2 border-dashed border-border-light rounded-xl flex flex-col items-center justify-center text-text-muted gap-2">
           <IoQrCodeOutline size={32} strokeWidth={1} />
           <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum QR Code gerado</p>
        </div>
      )}
    </div>
  );
}
