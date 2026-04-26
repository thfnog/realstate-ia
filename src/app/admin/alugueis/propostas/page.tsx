'use client';

import { useState, useEffect } from 'react';
import { PropostaAluguel, Imovel } from '@/lib/database.types';
import { formatCurrency, getConfig } from '@/lib/countryConfig';
import { toast } from 'sonner';
import { IoCheckmarkCircleOutline, IoCloseCircleOutline, IoDocumentTextOutline, IoTimeOutline, IoCheckmarkDoneOutline, IoEyeOutline } from 'react-icons/io5';
import PropostaDetalhesModal from '@/components/admin/alugueis/PropostaDetalhesModal';

export default function AdminPropostasPage() {
  const [propostas, setPropostas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposta, setSelectedProposta] = useState<any>(null);
  const config = getConfig();

  useEffect(() => {
    fetchPropostas();
  }, []);

  async function fetchPropostas() {
    try {
      const res = await fetch('/api/admin/propostas');
      const data = await res.json();
      setPropostas(data);
    } catch (err) {
      toast.error('Erro ao carregar propostas');
    } finally {
      setLoading(false);
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/propostas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Status atualizado para ${status}`);
        fetchPropostas();
      }
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  const convertToContract = async (proposta: any) => {
    toast.promise(
      fetch(`/api/admin/propostas/${proposta.id}/converter`, { method: 'POST' }),
      {
        loading: 'Gerando contrato...',
        success: 'Contrato gerado com sucesso! Redirecionando...',
        error: 'Erro ao gerar contrato'
      }
    );
  };

  if (loading) return <div className="p-10 animate-pulse font-black text-slate-400">CARREGANDO PROPOSTAS...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Propostas de Aluguel</h1>
          <p className="text-slate-500 mt-1 font-medium">Gerencie a esteira de locação e análise de crédito.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Pendentes', count: propostas.filter(p => p.status === 'pendente').length, color: 'bg-orange-500' },
          { label: 'Em Análise', count: propostas.filter(p => p.status === 'em_analise').length, color: 'bg-blue-500' },
          { label: 'Aprovadas', count: propostas.filter(p => p.status === 'aprovada').length, color: 'bg-emerald-500' },
          { label: 'Total', count: propostas.length, color: 'bg-slate-900' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.count}</p>
            </div>
            <div className={`w-2 h-10 rounded-full ${stat.color}`} />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inquilino / Contato</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Imóvel / Proposta</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Garantia</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {propostas.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-all group">
                <td className="px-8 py-6">
                  <p className="font-black text-slate-900 leading-none mb-1">{p.inquilino_nome}</p>
                  <p className="text-xs text-slate-400 font-bold">{p.inquilino_email}</p>
                  <p className="text-[10px] text-primary font-black mt-1 uppercase tracking-tighter">{p.inquilino_telefone}</p>
                </td>
                <td className="px-8 py-6">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-tighter mb-1">{p.imovel?.referencia}</p>
                  <p className="font-black text-slate-900">{formatCurrency(p.valor_proposto, config)}</p>
                  <p className="text-[10px] text-slate-400 font-bold">Início: {p.data_pretendida_inicio ? new Date(p.data_pretendida_inicio).toLocaleDateString() : 'Imediato'}</p>
                </td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    {p.garantia_pretendida?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-8 py-6">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setSelectedProposta(p)}
                      className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                      title="Ver Detalhes e Análise"
                    >
                      <IoEyeOutline size={18} />
                    </button>
                    {p.status === 'pendente' && (
                      <button 
                        onClick={() => updateStatus(p.id, 'em_analise')}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        title="Iniciar Análise"
                      >
                        <IoTimeOutline size={18} />
                      </button>
                    )}
                    {p.status === 'em_analise' && (
                      <button 
                        onClick={() => updateStatus(p.id, 'aprovada')}
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title="Aprovar"
                      >
                        <IoCheckmarkCircleOutline size={18} />
                      </button>
                    )}
                    {p.status === 'aprovada' && (
                      <button 
                        onClick={() => convertToContract(p)}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                      >
                        <IoCheckmarkDoneOutline size={14} /> Gerar Contrato
                      </button>
                    )}
                    {['pendente', 'em_analise'].includes(p.status) && (
                      <button 
                        onClick={() => updateStatus(p.id, 'rejeitada')}
                        className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                        title="Rejeitar"
                      >
                        <IoCloseCircleOutline size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {propostas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center">
                  <div className="max-w-xs mx-auto space-y-4 opacity-30">
                    <div className="text-6xl">📥</div>
                    <p className="font-black text-slate-400 uppercase tracking-widest">Nenhuma proposta recebida até o momento.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedProposta && (
        <PropostaDetalhesModal 
          proposta={selectedProposta}
          config={config}
          onClose={() => setSelectedProposta(null)}
          onUpdate={() => {
            fetchPropostas();
            setSelectedProposta(null);
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: any = {
    pendente: { label: 'Pendente', bg: 'bg-orange-50', text: 'text-orange-600' },
    em_analise: { label: 'Em Análise', bg: 'bg-blue-50', text: 'text-blue-600' },
    aprovada: { label: 'Aprovada', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    rejeitada: { label: 'Rejeitada', bg: 'bg-rose-50', text: 'text-rose-600' },
    aguardando_documentos: { label: 'Docs Pendentes', bg: 'bg-purple-50', text: 'text-purple-600' },
    finalizada: { label: 'Finalizada', bg: 'bg-slate-100', text: 'text-slate-600' },
  };

  const c = configs[status] || configs.pendente;

  return (
    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${c.bg} ${c.text} border border-current/10`}>
      {c.label}
    </span>
  );
}
