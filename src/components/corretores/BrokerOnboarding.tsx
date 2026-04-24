'use client';

import { useState, useEffect } from 'react';
import WhatsAppConnector from '@/components/corretores/WhatsAppConnector';

interface BrokerOnboardingProps {
  brokerId: string;
}

export default function BrokerOnboarding({ brokerId }: BrokerOnboardingProps) {
  const [status, setStatus] = useState<'open' | 'close' | 'connecting' | 'loading'>('loading');

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`/api/corretores/${brokerId}`);
        const data = await res.json();
        if (data.whatsapp_status) {
          setStatus(data.whatsapp_status);
        } else {
          setStatus('close');
        }
      } catch (err) {
        setStatus('close');
      }
    }
    checkStatus();
  }, [brokerId]);

  if (status === 'open') return null;

  return (
    <div className="bg-gradient-to-br from-primary to-indigo-700 rounded-3xl p-8 text-white shadow-2xl shadow-primary/20 mb-8 overflow-hidden relative group">
      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10">
        <div className="flex-1 space-y-4 text-center lg:text-left">
          <div className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest mb-2">
            🚀 Onboarding do Consultor
          </div>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight leading-tight">
            Conecte seu WhatsApp para começar a receber leads
          </h2>
          <p className="text-white/70 text-lg max-w-xl">
            Sem o WhatsApp conectado, o ImobIA não consegue enviar auto-respostas ou notificações em seu nome. É rápido e seguro!
          </p>
        </div>

        <div className="w-full lg:w-auto bg-white rounded-2xl p-6 shadow-xl text-slate-900 min-w-[320px]">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            Configuração de Instância
          </h3>
          <WhatsAppConnector 
            instanceName={`realstate-iabroker-${brokerId}`} 
            brokerId={brokerId}
          />
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
    </div>
  );
}
