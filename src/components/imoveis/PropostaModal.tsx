'use client';

import { useState } from 'react';
import { Imovel } from '@/lib/database.types';
import { CountryConfig, formatCurrency } from '@/lib/countryConfig';
import { IoClose, IoCloudUploadOutline } from 'react-icons/io5';
import { toast } from 'sonner';

interface PropostaModalProps {
  imovel: Imovel;
  config: CountryConfig;
  onClose: () => void;
}

export default function PropostaModal({ imovel, config, onClose }: PropostaModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    inquilino_nome: '',
    inquilino_email: '',
    inquilino_telefone: '',
    valor_proposto: imovel.valor,
    garantia_pretendida: 'caucao',
    data_pretendida_inicio: new Date().toISOString().split('T')[0],
    observacoes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/public/propostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          imovel_id: imovel.id,
          imobiliaria_id: imovel.imobiliaria_id
        })
      });

      if (res.ok) {
        setStep(2);
        toast.success('Proposta enviada com sucesso!');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erro ao enviar proposta');
      }
    } catch (err) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900">Fazer Proposta de Aluguel</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{imovel.referencia}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all">
            <IoClose size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="p-8">
          {step === 1 ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Seu Nome Completo</label>
                  <input
                    required
                    type="text"
                    value={formData.inquilino_nome}
                    onChange={e => setFormData({...formData, inquilino_nome: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary/10 outline-none font-bold"
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">E-mail</label>
                  <input
                    required
                    type="email"
                    value={formData.inquilino_email}
                    onChange={e => setFormData({...formData, inquilino_email: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary/10 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Telefone / WhatsApp</label>
                  <input
                    required
                    type="tel"
                    value={formData.inquilino_telefone}
                    onChange={e => setFormData({...formData, inquilino_telefone: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary/10 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor da Proposta ({config.currency.symbol})</label>
                  <input
                    required
                    type="number"
                    value={formData.valor_proposto}
                    onChange={e => setFormData({...formData, valor_proposto: parseFloat(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary/10 outline-none font-black text-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Garantia Pretendida</label>
                  <select
                    value={formData.garantia_pretendida}
                    onChange={e => setFormData({...formData, garantia_pretendida: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary/10 outline-none font-bold"
                  >
                    <option value="caucao">Caução</option>
                    <option value="seguro_fianca">Seguro Fiança</option>
                    <option value="fiador">Fiador</option>
                    <option value="titulo_capitalizacao">Título de Capitalização</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observações (Opcional)</label>
                  <textarea
                    rows={3}
                    value={formData.observacoes}
                    onChange={e => setFormData({...formData, observacoes: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary/10 outline-none font-medium text-sm"
                    placeholder="Conte-nos um pouco sobre seu perfil ou necessidades..."
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-4 rounded-2xl bg-primary text-white font-black hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar Proposta'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-6 py-8 animate-slide-up">
               <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-4xl">
                  ✓
               </div>
               <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-900">Proposta Recebida!</h2>
                  <p className="text-slate-500">
                    Nossa equipe analisará sua proposta e entrará em contato em breve para os próximos passos da análise de crédito.
                  </p>
               </div>
               <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">O que acontece agora?</p>
                  <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                    <li>Análise preliminar pela imobiliária.</li>
                    <li>Solicitação de comprovantes de renda/id.</li>
                    <li>Aprovação e assinatura do contrato.</li>
                  </ol>
               </div>
               <button
                 onClick={onClose}
                 className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-all shadow-xl"
               >
                 Entendido, fechar
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
