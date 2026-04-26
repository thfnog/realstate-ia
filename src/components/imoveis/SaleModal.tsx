'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { formatCurrency, CountryConfig } from '@/lib/countryConfig';

interface SaleModalProps {
  imovel: any;
  config: CountryConfig;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SaleModal({ imovel, config, onClose, onSuccess }: SaleModalProps) {
  const [loading, setLoading] = useState(false);
  const [valorVenda, setValorVenda] = useState(imovel.valor || 0);
  const [porcentagemComissao, setPorcentagemComissao] = useState(imovel.comissao_venda || 5.0);

  const valorComissao = (valorVenda * porcentagemComissao) / 100;

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch('/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imovel_id: imovel.id,
          valor_venda: valorVenda,
          porcentagem_comissao: porcentagemComissao
        })
      });

      if (res.ok) {
        toast.success('Venda registrada com sucesso!');
        onSuccess();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erro ao registrar venda');
      }
    } catch (err) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        <div className="p-8">
          <h3 className="text-2xl font-black text-text-primary tracking-tight mb-2">Registrar Venda</h3>
          <p className="text-sm text-text-secondary mb-6">Confirme os valores finais para cálculo de comissão.</p>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Valor Final de Venda</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-text-secondary">{config.currency.symbol}</span>
                <input 
                  type="number"
                  value={valorVenda}
                  onChange={e => setValorVenda(parseFloat(e.target.value))}
                  className="w-full pl-10 pr-4 py-4 rounded-2xl border-2 border-border-light focus:border-primary focus:outline-none text-xl font-black transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Porcentagem de Comissão</label>
              <div className="relative">
                <input 
                  type="number"
                  step="0.1"
                  value={porcentagemComissao}
                  onChange={e => setPorcentagemComissao(parseFloat(e.target.value))}
                  className="w-full px-4 py-4 rounded-2xl border-2 border-border-light focus:border-primary focus:outline-none text-xl font-black transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-text-secondary">%</span>
              </div>
            </div>

            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
               <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1 text-center">Comissão Prevista</p>
               <p className="text-3xl font-black text-emerald-600 text-center">
                  {formatCurrency(valorComissao, config)}
               </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <button
              onClick={onClose}
              className="py-4 rounded-2xl bg-surface-alt text-text-primary font-bold hover:bg-surface-hover transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="py-4 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Confirmar Venda'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
