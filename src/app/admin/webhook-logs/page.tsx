'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight, 
  RefreshCcw,
  Code
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WebhookLog {
  id: string;
  source: string;
  status: string;
  payload: any;
  error_message: string | null;
  created_at: string;
}

export default function WebhookLogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/webhook-logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // Auto refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'erro': return <XCircle className="w-5 h-5 text-rose-500" />;
      case 'processando': return <RefreshCcw className="w-5 h-5 text-amber-500 animate-spin" />;
      default: return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      whatsapp: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      grupozap: 'bg-orange-100 text-orange-700 border-orange-200',
      email: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[source] || 'bg-slate-100 text-slate-700'}`}>
        {source.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-indigo-600" />
            Fila de Processamento
          </h1>
          <p className="text-slate-500 mt-2">Monitore a ingestão de leads e o processamento de webhooks em tempo real.</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 font-medium shadow-sm"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Logs List */}
        <div className="lg:col-span-2 space-y-4">
          {loading && logs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-slate-400">
               <RefreshCcw className="w-10 h-10 animate-spin mb-4" />
               <p>Carregando registros...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 italic">
               Nenhum webhook registrado recentemente.
            </div>
          ) : (
            logs.map(log => (
              <div 
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className={`
                  bg-white border p-4 rounded-xl cursor-pointer transition-all hover:shadow-md flex items-center gap-4
                  ${selectedLog?.id === log.id ? 'border-indigo-500 ring-2 ring-indigo-50/50 shadow-sm' : 'border-slate-200'}
                `}
              >
                <div className="shrink-0">
                  {getStatusIcon(log.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getSourceBadge(log.source)}
                    <span className="text-xs text-slate-400">
                      {format(new Date(log.created_at), "HH:mm:ss 'em' dd/MM", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-700 truncate">
                    ID: {log.id.split('-')[0]}...
                  </div>
                </div>

                <div className="shrink-0 text-slate-400">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl sticky top-8 min-h-[400px]">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-6 text-indigo-300">
              <Code className="w-5 h-5" />
              Payload Detalhado
            </h2>
            
            {selectedLog ? (
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Status</label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedLog.status)}
                    <span className="capitalize">{selectedLog.status}</span>
                  </div>
                </div>

                {selectedLog.error_message && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-300 text-sm">
                    <strong>Erro:</strong> {selectedLog.error_message}
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">JSON Raw</label>
                  <pre className="bg-black/40 p-4 rounded-xl text-[10px] leading-relaxed font-mono overflow-auto max-h-[400px] scrollbar-hide text-emerald-400/90 border border-white/5">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-sm text-center">
                <Code className="w-12 h-12 mb-4 opacity-10" />
                Selecione um registro para ver os dados técnicos recebidos.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
