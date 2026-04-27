'use client';

import { useState, useEffect } from 'react';
import { 
  IoPulseOutline, 
  IoCheckmarkCircle, 
  IoCloseCircle, 
  IoAlertCircle, 
  IoCloudOutline, 
  IoTerminalOutline,
  IoLogoVercel,
  IoReloadOutline
} from 'react-icons/io5';
import { SiSupabase, SiAmazonaws, SiOpenai } from 'react-icons/si';

interface HealthStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'not_configured';
  message: string;
}

export default function MasterStatusPage() {
  const [health, setHealth] = useState<Record<string, HealthStatus> | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/master/health');
      const data = await res.json();
      setHealth(data);
      setLastCheck(new Date());
    } catch (err) {
      console.error('Erro ao buscar saúde do sistema:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'degraded': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'down': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <IoCheckmarkCircle size={20} />;
      case 'degraded': return <IoAlertCircle size={20} />;
      case 'down': return <IoCloseCircle size={20} />;
      default: return <IoAlertCircle size={20} />;
    }
  };

  const ServiceIcon = ({ name }: { name: string }) => {
    if (name.includes('Vercel')) return <IoLogoVercel size={24} />;
    if (name.includes('Supabase')) return <SiSupabase size={24} />;
    if (name.includes('Evolution')) return <SiAmazonaws size={24} />;
    if (name.includes('OpenAI')) return <SiOpenai size={24} />;
    return <IoCloudOutline size={24} />;
  };

  return (
    <div className="animate-fade-in space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-rose-500/10 text-rose-600 rounded-xl">
              <IoPulseOutline size={24} />
            </span>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Status do Sistema</h1>
          </div>
          <p className="text-slate-500 font-medium">Monitoramento em tempo real da infraestrutura e integrações externas.</p>
        </div>
        <button 
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200/50 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
        >
          <IoReloadOutline className={loading ? 'animate-spin' : ''} />
          Recarregar Status
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading && !health ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-[2rem] border border-slate-100 animate-pulse" />
          ))
        ) : health && Object.entries(health).map(([key, item]) => (
          <div key={key} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 space-y-6 relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-primary transition-colors">
                <ServiceIcon name={item.name} />
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(item.status)}`}>
                {getStatusIcon(item.status)}
                {item.status === 'not_configured' ? 'Não Conf.' : item.status}
              </div>
            </div>
            
            <div>
              <h3 className="font-black text-slate-900 text-lg tracking-tight mb-1">{item.name}</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">{item.message}</p>
            </div>

            <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden">
               <div className={`h-full transition-all duration-1000 ${item.status === 'operational' ? 'bg-emerald-500 w-full' : item.status === 'degraded' ? 'bg-amber-500 w-2/3' : 'bg-rose-500 w-1/4'}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-900/30">
        <div className="absolute top-0 right-0 p-10 opacity-5">
           <IoTerminalOutline size={180} />
        </div>
        <div className="relative z-10 space-y-4">
           <h3 className="text-xl font-black tracking-tight">Logs de Integridade</h3>
           <div className="bg-black/30 backdrop-blur-md rounded-2xl p-6 font-mono text-[11px] text-slate-400 space-y-2 max-h-64 overflow-y-auto">
              <p className="text-emerald-400">[SYSTEM] Health check iniciado em {lastCheck.toLocaleString()}</p>
              <p>› Verificando latência do banco de dados (Supabase)...</p>
              {health?.supabase.status === 'operational' && <p className="text-emerald-400">✓ Supabase: OK</p>}
              <p>› Verificando disponibilidade da Evolution API (AWS)...</p>
              {health?.evolution.status === 'operational' && <p className="text-emerald-400">✓ Evolution API: OK</p>}
              <p>› Verificando conectividade com OpenAI/Gemini...</p>
              {health?.openai.status === 'operational' && <p className="text-emerald-400">✓ AI Providers: OK</p>}
              <p className="text-slate-500 italic mt-4">// Monitoramento preventivo ativo 24/7</p>
           </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Última verificação: {lastCheck.toLocaleTimeString()}</p>
      </div>
    </div>
  );
}
