'use client';

import { useState } from 'react';
import { PropostaAluguel, PropostaDocumento } from '@/lib/database.types';
import { IoClose, IoCheckmarkCircle, IoAlertCircle, IoDocumentAttachOutline, IoShieldCheckmarkOutline } from 'react-icons/io5';
import { formatCurrency, CountryConfig } from '@/lib/countryConfig';
import { toast } from 'sonner';

interface PropostaDetalhesModalProps {
  proposta: PropostaAluguel;
  config: CountryConfig;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PropostaDetalhesModal({ proposta, config, onClose, onUpdate }: PropostaDetalhesModalProps) {
  const [loading, setLoading] = useState(false);
  const [checks, setChecks] = useState({
    serasa: proposta.analise_credito_check_serasa || false,
    renda: proposta.analise_credito_check_renda || false,
    antecedentes: proposta.analise_credito_check_antecedentes || false,
  });
  const [parecer, setParecer] = useState(proposta.analise_credito_parecer || '');

  const saveAnalysis = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/propostas/${proposta.id}/analise`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analise_credito_check_serasa: checks.serasa,
          analise_credito_check_renda: checks.renda,
          analise_credito_check_antecedentes: checks.antecedentes,
          analise_credito_parecer: parecer
        })
      });
      if (res.ok) {
        toast.success('Análise salva com sucesso');
        onUpdate();
      }
    } catch (err) {
      toast.error('Erro ao salvar análise');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
                Proposta #{proposta.id.slice(0, 8)}
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                {proposta.status.replace('_', ' ')}
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{proposta.inquilino_nome}</h2>
            <p className="text-slate-400 font-medium">{proposta.inquilino_email} • {proposta.inquilino_telefone}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-2xl transition-all">
            <IoClose size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Info Section */}
          <div className="space-y-8">
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <IoDocumentAttachOutline size={16} /> Detalhes da Proposta
              </h3>
              <div className="bg-slate-50 p-6 rounded-3xl space-y-4 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Valor Proposto</span>
                  <span className="font-black text-slate-900">{formatCurrency(proposta.valor_proposto, config)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Garantia</span>
                  <span className="font-black text-slate-900 uppercase text-xs">{proposta.garantia_pretendida?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Data de Início</span>
                  <span className="font-black text-slate-900">{proposta.data_pretendida_inicio || 'Imediato'}</span>
                </div>
                {proposta.observacoes && (
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações</p>
                    <p className="text-sm text-slate-600 leading-relaxed italic">"{proposta.observacoes}"</p>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <IoDocumentAttachOutline size={16} /> Documentos Enviados
              </h3>
              <div className="space-y-3">
                {proposta.documentos && proposta.documentos.length > 0 ? (
                  proposta.documentos.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary/20 transition-all cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-primary/10 transition-all">
                          <IoDocumentAttachOutline className="text-slate-400 group-hover:text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 capitalize">{doc.tipo_documento}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{doc.status}</p>
                        </div>
                      </div>
                      <button className="text-primary font-black text-[10px] uppercase hover:underline">Ver Arquivo</button>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 opacity-50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum documento anexado</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Analysis Section */}
          <div className="space-y-8">
            <section className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl shadow-slate-900/20">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <IoShieldCheckmarkOutline size={16} className="text-primary" /> Análise de Crédito Interna
              </h3>
              
              <div className="space-y-4 mb-8">
                {[
                  { id: 'serasa', label: 'Consulta Serasa / SPC', checked: checks.serasa },
                  { id: 'renda', label: 'Comprovante de Renda (3x)', checked: checks.renda },
                  { id: 'antecedentes', label: 'Antecedentes Criminais', checked: checks.antecedentes },
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={item.checked}
                      onChange={(e) => setChecks(prev => ({ ...prev, [item.id]: e.target.checked }))}
                      className="w-5 h-5 rounded-lg border-white/20 bg-white/5 checked:bg-primary checked:border-primary transition-all cursor-pointer focus:ring-0 focus:ring-offset-0"
                    />
                    <span className={`text-sm font-bold transition-all ${item.checked ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Parecer da Análise</label>
                <textarea 
                  value={parecer}
                  onChange={(e) => setParecer(e.target.value)}
                  placeholder="Descreva o resultado da análise de crédito..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary transition-all min-h-[120px] text-white placeholder:text-slate-600"
                />
              </div>

              <button 
                onClick={saveAnalysis}
                disabled={loading}
                className="w-full mt-6 py-4 bg-primary text-white font-black rounded-2xl hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {loading ? 'SALVANDO...' : 'SALVAR ANÁLISE'}
              </button>
            </section>

            <div className="flex flex-col gap-3">
               <button className="w-full py-4 bg-emerald-50 text-emerald-600 font-black rounded-2xl hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2">
                 <IoCheckmarkCircle size={20} /> APROVAR LOCAÇÃO
               </button>
               <button className="w-full py-4 bg-rose-50 text-rose-600 font-black rounded-2xl hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-2">
                 <IoAlertCircle size={20} /> REJEITAR PROPOSTA
               </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
