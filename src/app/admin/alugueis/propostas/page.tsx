'use client';

import { useState, useEffect } from 'react';
import { PropostaAluguel, Imovel } from '@/lib/database.types';
import { formatCurrency, getConfig } from '@/lib/countryConfig';
import { toast } from 'sonner';
import { IoCheckmarkCircleOutline, IoCloseCircleOutline, IoDocumentTextOutline, IoTimeOutline, IoCheckmarkDoneOutline, IoEyeOutline } from 'react-icons/io5';
import PropostaDetalhesModal from '@/components/admin/alugueis/PropostaDetalhesModal';

import { LoadingSkeleton, TableRowSkeleton } from '@/components/LoadingSkeleton';

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

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Propostas de Aluguel</h1>
          <p className="text-slate-500 mt-1 font-medium">Gerencie a esteira de locação e análise de crédito profissional.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Pendentes', count: propostas.filter(p => p.status === 'pendente').length, color: 'bg-orange-500' },
          { label: 'Em Análise', count: propostas.filter(p => p.status === 'em_analise').length, color: 'bg-blue-600' },
          { label: 'Aprovadas', count: propostas.filter(p => p.status === 'aprovada').length, color: 'bg-emerald-500' },
          { label: 'Total', count: propostas.length, color: 'bg-slate-900' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center justify-between group hover:-translate-y-1 transition-all duration-300">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              {loading ? <LoadingSkeleton className="h-8 w-12" /> : <p className="text-3xl font-black text-slate-900 tracking-tighter">{stat.count}</p>}
            </div>
            <div className={`w-1.5 h-12 rounded-full ${stat.color} opacity-20 group-hover:opacity-100 transition-opacity`} />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-50">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inquilino / Contato</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Imóvel / Proposta</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Garantia</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
            ) : propostas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-32 text-center">
                  <div className="max-w-xs mx-auto space-y-4 opacity-30">
                    <div className="text-7xl">📥</div>
                    <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Nenhuma proposta recebida até o momento.</p>
                  </div>
                </td>
              </tr>
            ) : (
              propostas.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-all group cursor-pointer">
                  <td className="px-8 py-7">
                    <p className="font-black text-slate-900 leading-none mb-1.5 text-lg tracking-tight group-hover:text-primary transition-colors">{p.inquilino_nome}</p>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-slate-400 font-bold">{p.inquilino_email}</p>
                      <span className="text-[10px] text-primary font-black uppercase tracking-tighter bg-primary/5 px-2 py-0.5 rounded-lg">{p.inquilino_telefone}</span>
                    </div>
                  </td>
                  <td className="px-8 py-7">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-tighter mb-1">{p.imovel?.referencia}</p>
                    <p className="font-black text-slate-900 text-lg">{formatCurrency(p.valor_proposto, config)}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Início: {p.data_pretendida_inicio ? new Date(p.data_pretendida_inicio).toLocaleDateString() : 'Imediato'}</p>
                  </td>
                  <td className="px-8 py-7">
                    <span className="px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-600 uppercase tracking-widest border border-slate-200">
                      {p.garantia_pretendida?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-7">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-8 py-7">
                    <div className="flex justify-end gap-2.5">
                      <button 
                        onClick={() => setSelectedProposta(p)}
                        className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm border border-slate-200"
                        title="Ver Detalhes e Análise"
                      >
                        <IoEyeOutline size={18} />
                      </button>
                      {p.status === 'pendente' && (
                        <button 
                          onClick={() => updateStatus(p.id, 'em_analise')}
                          className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"
                          title="Iniciar Análise"
                        >
                          <IoTimeOutline size={18} />
                        </button>
                      )}
                      {p.status === 'em_analise' && (
                        <button 
                          onClick={() => updateStatus(p.id, 'aprovada')}
                          className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"
                          title="Aprovar"
                        >
                          <IoCheckmarkCircleOutline size={18} />
                        </button>
                      )}
                      {p.status === 'aprovada' && (
                        <button 
                          onClick={() => convertToContract(p)}
                          className="px-6 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/30"
                        >
                          <IoCheckmarkDoneOutline size={14} /> Gerar Contrato
                        </button>
                      )}
                      {['pendente', 'em_analise'].includes(p.status) && (
                        <button 
                          onClick={() => updateStatus(p.id, 'rejeitada')}
                          className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100"
                          title="Rejeitar"
                        >
                          <IoCloseCircleOutline size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
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
    em_analise: { label: 'Análise', bg: 'bg-blue-50', text: 'text-blue-600' },
    aprovada: { label: 'Aprovada', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    rejeitada: { label: 'Rejeitada', bg: 'bg-rose-50', text: 'text-rose-600' },
    aguardando_documentos: { label: 'Docs', bg: 'bg-purple-50', text: 'text-purple-600' },
    finalizada: { label: 'Finalizada', bg: 'bg-slate-100', text: 'text-slate-600' },
  };

  const c = configs[status] || configs.pendente;

  return (
    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${c.bg} ${c.text} border border-current/10`}>
      {c.label}
    </span>
  );
}
