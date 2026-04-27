'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ContratoComDetalhes, ContratoStatus } from '@/lib/database.types';
import { toast } from 'sonner';
import { getConfig, formatCurrency } from '@/lib/countryConfig';

export default function ContratoDetalhesPage({ params }: { params: { id: string } }) {
  const [config, setConfig] = useState<any>(getConfig());
  const router = useRouter();
  const [contrato, setContrato] = useState<ContratoComDetalhes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch imobiliaria and contract in parallel
    Promise.all([
      fetch(`/api/contratos/${params.id}`),
      fetch('/api/imobiliaria')
    ])
    .then(async ([contratoRes, imobRes]) => {
      const contrattoData = await contratoRes.json();
      const imobData = await imobRes.json();
      
      setContrato(contrattoData);
      
      if (imobData && imobData.config_pais) {
        const { getConfigByCode } = require('@/lib/countryConfig');
        setConfig(getConfigByCode(imobData.config_pais));
      }
      
      setLoading(false);
    });
  }, [params.id]);

  const updateStatus = async (newStatus: ContratoStatus) => {
    try {
      const res = await fetch(`/api/contratos/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(`Contrato atualizado para ${newStatus}`);
        setContrato(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch {
      toast.error('Erro ao atualizar contrato');
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse">Carregando detalhes do contrato...</div>;
  if (!contrato) return <div className="p-20 text-center text-rose-500">Contrato não encontrado.</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex justify-between items-start">
        <div>
           <button onClick={() => router.back()} className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 hover:text-primary transition-all">← Voltar</button>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Detalhamento do Contrato</h1>
           <p className="text-slate-500 mt-1">ID: <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded">{contrato.id}</span></p>
        </div>
        <div className="flex gap-2">
           <a 
             href={`/api/contratos/${contrato.id}/gerar`}
             className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:scale-105 transition-all"
           >
             📥 Baixar Documento
           </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl space-y-8">
              <div className="flex justify-between items-center pb-6 border-b border-slate-50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl">
                      {contrato.tipo === 'venda' ? '🏠' : '🔑'}
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Negócio</p>
                       <p className="text-lg font-black text-slate-900 uppercase">{contrato.tipo}</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Atual</p>
                    <span className="inline-block mt-1 px-4 py-1.5 rounded-full text-xs font-black uppercase bg-amber-100 text-amber-700 border border-amber-200">
                      {contrato.status.replace('_', ' ')}
                    </span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                 <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Imóvel</p>
                    <h4 className="font-black text-slate-900">{contrato.imovel?.titulo}</h4>
                    <p className="text-xs text-slate-500 mt-1">{contrato.imovel?.referencia} • {contrato.imovel?.freguesia}</p>
                    <Link href={`/admin/imoveis/${contrato.imovel_id}`} className="mt-4 inline-block text-[10px] font-black text-primary uppercase underline">Ver Ficha Técnica</Link>
                 </div>
                 <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cliente / Lead</p>
                    <h4 className="font-black text-slate-900">{contrato.lead?.nome}</h4>
                    <p className="text-xs text-slate-500 mt-1">{contrato.lead?.telefone}</p>
                    <Link href={`/admin/leads?status=${contrato.lead?.status}`} className="mt-4 inline-block text-[10px] font-black text-primary uppercase underline">Ver Histórico</Link>
                 </div>
              </div>

              <div>
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-4">Ações de Fluxo</h3>
                 <div className="flex flex-wrap gap-2">
                    {contrato.status === 'rascunho' && (
                      <button onClick={() => updateStatus('assinatura_pendente')} className="px-6 py-2.5 bg-indigo-500 text-white text-xs font-black rounded-xl hover:bg-indigo-600 transition-all">Enviar para Assinatura</button>
                    )}
                    {contrato.status === 'assinatura_pendente' && (
                      <button onClick={() => updateStatus('ativo')} className="px-6 py-2.5 bg-emerald-500 text-white text-xs font-black rounded-xl hover:bg-emerald-600 transition-all">Ativar Contrato (Assinado)</button>
                    )}
                    <button onClick={() => updateStatus('cancelado')} className="px-6 py-2.5 bg-white text-rose-500 border border-rose-100 text-xs font-black rounded-xl hover:bg-rose-50 transition-all">Cancelar Negócio</button>
                 </div>
              </div>
           </div>

           {/* Financial Section */}
           <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-6">Controle Financeiro / Parcelas</h3>
              
              <div className="overflow-hidden border border-slate-100 rounded-2xl">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                       <tr>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {contrato.pagamentos?.length > 0 ? contrato.pagamentos.map(p => (
                         <tr key={p.id}>
                            <td className="px-4 py-4 text-xs font-bold text-slate-700 capitalize">{p.tipo.replace('_', ' ')}</td>
                            <td className="px-4 py-4 text-xs text-slate-500">{new Date(p.data_vencimento).toLocaleDateString(config.currency.locale)}</td>
                            <td className="px-4 py-4 text-xs font-black text-slate-900 text-right">{formatCurrency(p.valor_esperado, config)}</td>
                            <td className="px-4 py-4 text-center">
                               <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${p.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                 {p.status}
                               </span>
                            </td>
                         </tr>
                       )) : (
                         <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400 italic">Nenhum lançamento financeiro registrado.</td>
                         </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
           <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-16 -mt-16"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total do Contrato</p>
              <h2 className="text-4xl font-black text-primary mb-6">
                {formatCurrency(contrato.valor_total, config)}
              </h2>
              
              <div className="space-y-4">
                 <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Data de Início</span>
                    <span className="font-black">{new Date(contrato.data_inicio).toLocaleDateString(config.currency.locale)}</span>
                 </div>
                 <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Consultor</span>
                    <span className="font-black">{contrato.corretor?.nome || 'Não atribuído'}</span>
                 </div>
              </div>
           </div>

           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Notas & Cláusulas Extras</h4>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                {contrato.clausulas_extras || 'Nenhuma cláusula especial adicionada.'}
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
