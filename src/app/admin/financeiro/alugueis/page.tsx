'use client';

import { useState, useEffect } from 'react';
import { PagamentoContrato, ContratoComDetalhes } from '@/lib/database.types';
import { formatCurrency, getConfig } from '@/lib/countryConfig';
import { toast } from 'sonner';

export default function FinanceiroAlugueisPage() {
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(getConfig());

  useEffect(() => {
    // Fetch config and contracts
    Promise.all([
      fetch('/api/imobiliaria'),
      fetch('/api/contratos')
    ])
    .then(async ([imobRes, contratosRes]) => {
      const imobData = await imobRes.json();
      const contratos = await contratosRes.json();

      if (imobData && imobData.config_pais) {
        const { getConfigByCode } = require('@/lib/countryConfig');
        setConfig(getConfigByCode(imobData.config_pais));
      }

      // Flatten all payments from rental contracts
      const allPagamentos: any[] = [];
      contratos.forEach((c: any) => {
        if (c.tipo === 'aluguel' && c.pagamentos) {
          c.pagamentos.forEach((p: any) => {
            allPagamentos.push({
              ...p,
              contrato: c,
              imovel: c.imovel,
              lead: c.lead
            });
          });
        }
      });
      setPagamentos(allPagamentos.sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()));
      setLoading(false);
    });
  }, []);

  const stats = {
    totalRecebido: pagamentos.filter(p => p.status === 'pago').reduce((acc, p) => acc + p.valor_pago, 0),
    taxasMes: pagamentos.filter(p => p.status === 'pago').reduce((acc, p) => acc + (p.valor_taxa_adm || 0), 0),
    repassesPendentes: pagamentos.filter(p => p.status === 'pago' && p.status_repasse === 'pendente').reduce((acc, p) => acc + (p.valor_repasse_proprietario || 0), 0),
  };

  const handleProcessRepasse = async (pagamentoId: string) => {
    toast.promise(
      fetch(`/api/financeiro/repasses/${pagamentoId}`, { method: 'POST' }),
      {
        loading: 'Processando repasse...',
        success: 'Repasse processado com sucesso!',
        error: 'Erro ao processar repasse'
      }
    );
  };

  if (loading) return <div className="p-10 animate-pulse">Carregando dados financeiros...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão Financeira</h1>
          <p className="text-slate-500 mt-1">Controle de aluguéis, taxas e repasses aos proprietários.</p>
        </div>
        <div className="flex gap-4">
           <button className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all">
             Relatório Mensal
           </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receita Líquida (Taxas)</p>
          <p className="text-3xl font-black text-primary">{formatCurrency(stats.taxasMes, config)}</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-500 text-xs font-bold">
             <span>↑ 12% vs mês anterior</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Repasses Pendentes</p>
          <p className="text-3xl font-black text-orange-500">{formatCurrency(stats.repassesPendentes, config)}</p>
          <p className="mt-1 text-xs text-slate-400">Aguardando processamento</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Recebido (Bruto)</p>
          <p className="text-3xl font-black text-slate-900">{formatCurrency(stats.totalRecebido, config)}</p>
          <p className="mt-1 text-xs text-slate-400">Total transacionado no período</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800">Fluxo de Caixa de Locação</h3>
          <div className="flex gap-2">
            <select className="text-xs font-bold bg-slate-50 border-none rounded-lg px-3 py-1 outline-none">
              <option>Todos os Status</option>
              <option>Pendentes</option>
              <option>Pagos</option>
            </select>
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Imóvel / Inquilino</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Bruto</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa Adm</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Repasse Prop.</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Pag.</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pagamentos.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-slate-700">{new Date(p.data_vencimento).toLocaleDateString()}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-black text-slate-900">{p.imovel?.referencia}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{p.lead?.nome}</p>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                  {formatCurrency(p.valor_esperado, config)}
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-primary">-{formatCurrency(p.valor_taxa_adm || 0, config)}</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-black text-slate-700">{formatCurrency(p.valor_repasse_proprietario || 0, config)}</p>
                  {p.status_repasse === 'processado' ? (
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Liquidado</span>
                  ) : p.status_repasse === 'pendente' ? (
                    <span className="text-[9px] font-black text-orange-400 uppercase tracking-tighter">Aguardando Baixa</span>
                  ) : null}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    p.status === 'pago' ? 'bg-emerald-50 text-emerald-600' : 
                    p.status === 'atrasado' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {p.status === 'pago' && p.status_repasse === 'pendente' && (
                    <button 
                      onClick={() => handleProcessRepasse(p.id)}
                      className="p-2 bg-emerald-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg shadow-emerald-500/20"
                      title="Processar Repasse"
                    >
                      ✓
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
