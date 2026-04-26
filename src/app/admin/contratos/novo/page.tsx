'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LeadComCorretor, Imovel, ContratoTipo } from '@/lib/database.types';
import { toast } from 'sonner';

function NovoContratoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get('leadId');
  const imovelId = searchParams.get('imovelId');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [leads, setLeads] = useState<LeadComCorretor[]>([]);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  
  const [formData, setFormData] = useState({
    lead_id: leadId || '',
    imovel_id: imovelId || '',
    tipo: 'venda' as ContratoTipo,
    valor_total: 0,
    valor_entrada_caucao: 0,
    data_inicio: new Date().toISOString().split('T')[0],
    dia_vencimento: 5,
    corretor_id: '',
  });

  useEffect(() => {
    fetch('/api/leads')
      .then(res => res.json())
      .then(data => setLeads(data.data || []));
    
    fetch('/api/imoveis?status=disponivel')
      .then(res => res.json())
      .then(data => setImoveis(data.data || []));
  }, []);

  useEffect(() => {
    if (formData.imovel_id) {
      const imovel = imoveis.find(i => i.id === formData.imovel_id);
      if (imovel) {
        setFormData(prev => ({
          ...prev, 
          valor_total: imovel.valor,
          corretor_id: imovel.corretor_id || '',
          tipo: imovel.finalidade === 'arrendamento' ? 'aluguel' : 'venda'
        }));
      }
    }
  }, [formData.imovel_id, imoveis]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success('Contrato criado com sucesso!');
        router.push('/admin/contratos');
      }
    } catch (err) {
      toast.error('Erro ao criar contrato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Novo Contrato</h1>
        <p className="text-slate-500 mt-1">Siga os passos para formalizar o negócio.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 w-full bg-slate-100">
           <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(step/3)*100}%` }} />
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6 animate-slide-up">
               <h2 className="text-xl font-black text-slate-800">1. Seleção de Partes</h2>
               <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cliente (Lead)</label>
                    <select 
                      value={formData.lead_id} 
                      onChange={e => setFormData({...formData, lead_id: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    >
                       <option value="">Selecione o cliente</option>
                       {leads.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.telefone})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Imóvel</label>
                    <select 
                      value={formData.imovel_id} 
                      onChange={e => setFormData({...formData, imovel_id: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    >
                       <option value="">Selecione o imóvel</option>
                       {imoveis.map(i => <option key={i.id} value={i.id}>{i.referencia} - {i.titulo}</option>)}
                    </select>
                  </div>
               </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-slide-up">
               <h2 className="text-xl font-black text-slate-800">2. Condições Comerciais</h2>
               <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Contrato</label>
                    <div className="flex gap-2">
                       {['venda', 'aluguel'].map(t => (
                         <button
                           key={t}
                           onClick={() => setFormData({...formData, tipo: t as any})}
                           className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest border transition-all ${
                             formData.tipo === t ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-200'
                           }`}
                         >
                           {t}
                         </button>
                       ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor Total / Aluguel</label>
                    <input 
                      type="number" 
                      value={formData.valor_total}
                      onChange={e => setFormData({...formData, valor_total: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Entrada / Caução</label>
                    <input 
                      type="number" 
                      value={formData.valor_entrada_caucao}
                      onChange={e => setFormData({...formData, valor_entrada_caucao: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data de Início</label>
                    <input 
                      type="date" 
                      value={formData.data_inicio}
                      onChange={e => setFormData({...formData, data_inicio: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                  {formData.tipo === 'aluguel' && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vencimento (Dia)</label>
                      <input 
                        type="number" 
                        min="1" max="31"
                        value={formData.dia_vencimento}
                        onChange={e => setFormData({...formData, dia_vencimento: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                      />
                    </div>
                  )}
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-slide-up">
               <h2 className="text-xl font-black text-slate-800">3. Revisão Final</h2>
               <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex justify-between">
                     <span className="text-xs text-slate-500 font-bold uppercase">Imóvel</span>
                     <span className="text-xs font-black text-slate-900">{imoveis.find(i => i.id === formData.imovel_id)?.titulo}</span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-xs text-slate-500 font-bold uppercase">Cliente</span>
                     <span className="text-xs font-black text-slate-900">{leads.find(l => l.id === formData.lead_id)?.nome}</span>
                  </div>
                  <div className="flex justify-between pt-4 border-t border-slate-200">
                     <span className="text-xs text-slate-500 font-bold uppercase">Valor Negócio</span>
                     <span className="text-lg font-black text-primary">{formData.valor_total.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
               </div>
               <p className="text-[10px] text-slate-400 text-center px-8 italic">
                 Ao clicar em confirmar, o contrato será criado em estado de Rascunho e poderá ser editado antes da emissão do PDF.
               </p>
            </div>
          )}

          <div className="flex justify-between mt-10 pt-6 border-t border-slate-100">
             <button 
               onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}
               className="px-6 py-3 text-slate-500 font-bold hover:text-slate-900 transition-all"
             >
                {step === 1 ? 'Cancelar' : 'Voltar'}
             </button>
             <button 
               onClick={() => step < 3 ? setStep(s => s + 1) : handleCreate()}
               disabled={loading || (step === 1 && (!formData.lead_id || !formData.imovel_id))}
               className="px-10 py-3 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
             >
                {loading ? 'Salvando...' : (step === 3 ? 'Confirmar e Criar' : 'Próximo Passo')}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NovoContratoPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center animate-pulse">Carregando formulário...</div>}>
      <NovoContratoForm />
    </Suspense>
  );
}
