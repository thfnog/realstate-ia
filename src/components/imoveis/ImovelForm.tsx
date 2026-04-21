'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TipoImovel, StatusImovel, Moeda, NegocioImovel, Corretor, Imovel } from '@/lib/database.types';
import { getConfigByCode } from '@/lib/countryConfig';
import MapPicker from './MapPicker';
import MercadoIndicador from './MercadoIndicador';
import PhotoUploadZone from './PhotoUploadZone';
import { IoTrash, IoStar, IoStarOutline } from 'react-icons/io5';

interface ImovelFormProps {
  initialData?: Partial<Imovel>;
  onSuccess: () => void;
}

const STEPS = [
  { id: 1, label: 'Identificação', icon: '🆔' },
  { id: 2, label: 'Localização', icon: '📍' },
  { id: 3, label: 'Características', icon: '🏠' },
  { id: 4, label: 'Financeiro', icon: '💰' },
  { id: 5, label: 'Fotos & Finalizar', icon: '📸' }
];

export default function ImovelForm({ initialData, onSuccess }: ImovelFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [corretores, setCorretores] = useState<Corretor[]>([]);

  // Form State
  const [formData, setFormData] = useState<Partial<Imovel>>({
    titulo: '',
    tipo: 'apartamento',
    status: 'disponivel',
    pais: 'BR', // Default to BR as user is in BR now
    finalidade: 'venda',
    negocio: 'residencial',
    data_captacao: new Date().toISOString().split('T')[0],
    origem_captacao: 'angariação própria',
    vagas_garagem: 0,
    aceita_permuta: false,
    aceita_financiamento: true,
    fotos: [],
    ...initialData
  });

  const config = getConfigByCode(formData.pais as any || 'BR');

  useEffect(() => {
    fetch('/api/corretores')
      .then(res => res.json())
      .then(setCorretores)
      .catch(console.error);
  }, []);

  const nextStep = () => setStep(s => Math.min(s + 1, STEPS.length));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSave = async () => {
    setLoading(true);
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const url = formData.id ? `/api/imoveis/${formData.id}` : '/api/imoveis';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        onSuccess();
      }
    } catch (err) {
      console.error('Erro ao salvar imóvel:', err);
    } finally {
      setLoading(false);
    }
  };

  const progress = (Object.keys(formData).length / 30) * 100;

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-border-light max-w-5xl mx-auto flex flex-col h-[85vh]">
      {/* ProgressBar */}
      <div className="h-1.5 w-full bg-surface-alt">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out" 
          style={{ width: `${(step / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-56 bg-surface-alt/50 border-r border-border-light p-6 hidden md:block">
          <div className="space-y-6">
            {STEPS.map((s) => (
              <div 
                key={s.id} 
                className={`flex items-center gap-3 transition-all duration-300 ${step >= s.id ? 'opacity-100' : 'opacity-40'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${step === s.id ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white border border-border-light'}`}>
                  {step > s.id ? '✅' : s.id}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider ${step === s.id ? 'text-primary' : 'text-text-secondary'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-20 p-4 bg-primary/5 rounded-2xl border border-primary/10">
             <p className="text-[10px] text-primary font-bold uppercase mb-1 leading-tight">Completude do Cadastro</p>
             <div className="h-1 bg-primary/20 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${Math.min(progress, 100)}%` }} />
             </div>
             <p className="text-[10px] text-text-secondary mt-1">{Math.round(progress)}% preenchido</p>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto p-8 pt-6">
            
            {/* Step 1: Identificação */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-border-light pb-4 mb-6">
                   <h2 className="text-xl font-bold text-text-primary">Identificação Básica</h2>
                   <p className="text-text-secondary text-sm">Informações essenciais para identificar o imóvel no sistema.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-text-primary mb-2">Título do Imóvel</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Apartamento T3 com Vista Mar — Ref: 2025"
                        value={formData.titulo}
                        onChange={e => setFormData({...formData, titulo: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-border focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all bg-surface-alt/30"
                      />
                   </div>
                   
                   <div>
                      <label className="block text-sm font-semibold text-text-primary mb-2">Responsável</label>
                      <select 
                        value={formData.corretor_id || ''} 
                        onChange={e => setFormData({...formData, corretor_id: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-border focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all bg-surface-alt/30"
                      >
                         <option value="">Selecione um corretor</option>
                         {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                   </div>
                   
                   <div>
                      <label className="block text-sm font-semibold text-text-primary mb-2">Status</label>
                      <select 
                        value={formData.status} 
                        onChange={e => setFormData({...formData, status: e.target.value as StatusImovel})}
                        className="w-full px-4 py-3 rounded-xl border border-border focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all bg-surface-alt/30"
                      >
                         <option value="disponivel">Disponível</option>
                         <option value="reservado">Reservado</option>
                         <option value="vendido">Vendido</option>
                         <option value="arrendado">Arrendado</option>
                         <option value="retirado">Retirado</option>
                      </select>
                   </div>
                </div>
              </div>
            )}

            {/* Step 2: Localização */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                 <div className="border-b border-border-light pb-4 mb-6">
                   <h2 className="text-xl font-bold text-text-primary">Localização & Mapa</h2>
                   <p className="text-text-secondary text-sm">O endereço define os indicadores de inteligência de mercado.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-text-secondary uppercase mb-1 block">País</label>
                      <select 
                        value={formData.pais} 
                        onChange={e => setFormData({...formData, pais: e.target.value as 'PT' | 'BR'})}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface-alt/30"
                      >
                         <option value="PT">🇵🇹 Portugal</option>
                         <option value="BR">🇧🇷 Brasil</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                       <label className="text-xs font-bold text-text-secondary uppercase mb-1 block">{formData.pais === 'PT' ? 'Distrito' : 'Estado'}</label>
                       <input 
                         type="text" 
                         value={formData.distrito || ''}
                         onChange={e => setFormData({...formData, distrito: e.target.value})}
                         className="w-full px-3 py-2 rounded-lg border border-border"
                       />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-text-secondary uppercase mb-1 block">{formData.pais === 'PT' ? 'Concelho' : 'Cidade'}</label>
                       <input 
                         type="text" 
                         value={formData.concelho || ''}
                         onChange={e => setFormData({...formData, concelho: e.target.value})}
                         className="w-full px-3 py-2 rounded-lg border border-border"
                       />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-text-secondary uppercase mb-1 block">{formData.pais === 'PT' ? 'Freguesia' : 'Bairro'}</label>
                       <input 
                         type="text" 
                         value={formData.freguesia || ''}
                         onChange={e => setFormData({...formData, freguesia: e.target.value})}
                         className="w-full px-3 py-2 rounded-lg border border-border"
                       />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-text-secondary uppercase mb-1 block">CEP / Cód. Postal</label>
                       <input 
                         type="text" 
                         value={formData.codigo_postal || ''}
                         onChange={e => setFormData({...formData, codigo_postal: e.target.value})}
                         className="w-full px-3 py-2 rounded-lg border border-border"
                       />
                    </div>
                </div>

                <MapPicker 
                   lat={formData.latitude || null}
                   lng={formData.longitude || null}
                   address={`${formData.rua || ''}, ${formData.numero || ''}, ${formData.concelho || ''}`}
                   onChange={(lat, lng) => setFormData({...formData, latitude: lat, longitude: lng})}
                />
              </div>
            )}

            {/* Step 3: Características */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                 <div className="border-b border-border-light pb-4 mb-6">
                   <h2 className="text-xl font-bold text-text-primary">Características Técnicas</h2>
                   <p className="text-text-secondary text-sm">Detalhes que ajudam no filtro e recomendação automática.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                   <div>
                      <label className="block text-sm font-semibold text-text-primary mb-2">Tipo</label>
                      <select 
                        value={formData.tipo}
                        onChange={e => setFormData({...formData, tipo: e.target.value as TipoImovel})}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-surface-alt/30"
                      >
                         <option value="apartamento">Apartamento</option>
                         <option value="casa">Casa</option>
                         <option value="terreno">Terreno</option>
                         <option value="loja">Comercial</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-sm font-semibold text-text-primary mb-2">{config.terminology.quartosLabel}</label>
                      <input 
                        type="number" 
                        value={formData.quartos ?? ''}
                        onChange={e => setFormData({...formData, quartos: e.target.value === '' ? null : parseInt(e.target.value)})}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-surface-alt/30"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-semibold text-text-primary mb-2">Área Útil (m²)</label>
                      <input 
                        type="number" 
                        value={formData.area_util ?? ''}
                        onChange={e => setFormData({...formData, area_util: e.target.value === '' ? null : parseFloat(e.target.value)})}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-surface-alt/30"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-semibold text-text-primary mb-2">Vagas</label>
                      <input 
                        type="number" 
                        value={formData.vagas_garagem ?? 0}
                        onChange={e => setFormData({...formData, vagas_garagem: e.target.value === '' ? 0 : parseInt(e.target.value)})}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-surface-alt/30"
                      />
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-semibold text-text-primary mb-2">Comodidades</label>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {['Piscina', 'Ginásio', 'Elevador', 'Varanda', 'Jardim', 'Ar Condicionado'].map(item => (
                         <label key={item} className="flex items-center gap-3 p-3 rounded-xl border border-border-light hover:bg-surface-hover cursor-pointer transition-all">
                            <input 
                               type="checkbox" 
                               checked={formData.comodidades?.includes(item)}
                               onChange={(e) => {
                                  const current = formData.comodidades || [];
                                  setFormData({
                                     ...formData, 
                                     comodidades: e.target.checked ? [...current, item] : current.filter(i => i !== item)
                                  })
                               }}
                               className="w-4 h-4 text-primary rounded"
                            />
                            <span className="text-sm text-text-primary">{item}</span>
                         </label>
                      ))}
                   </div>
                </div>
              </div>
            )}

            {/* Step 4: Financeiro */}
            {step === 4 && (
              <div className="space-y-8 animate-fade-in">
                 <div className="border-b border-border-light pb-4">
                   <h2 className="text-xl font-bold text-text-primary">Dados Financeiros</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="md:col-span-2 space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-text-primary mb-2">Valor Pedido ({config.currency.symbol})</label>
                        <input 
                           type="number" 
                           value={formData.valor || ''}
                           onChange={e => setFormData({...formData, valor: parseFloat(e.target.value)})}
                           className="w-full text-3xl font-bold px-4 py-6 rounded-2xl border-2 border-primary/20 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-primary"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Condomínio /mês</label>
                            <input 
                               type="number" 
                               value={formData.condominio_mensal || ''}
                               onChange={e => setFormData({...formData, condominio_mensal: parseFloat(e.target.value)})}
                               className="w-full px-4 py-3 rounded-xl border border-border"
                            />
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-2">IMI ou IPTU /ano</label>
                            <input 
                               type="number" 
                               value={formData.imi_iptu_anual || ''}
                               onChange={e => setFormData({...formData, imi_iptu_anual: parseFloat(e.target.value)})}
                               className="w-full px-4 py-3 rounded-xl border border-border"
                            />
                         </div>
                      </div>
                   </div>

                   <div>
                      <MercadoIndicador 
                        valor={formData.valor || 0}
                        areaUtil={formData.area_util || 0}
                        concelho={formData.concelho || ''}
                        pais={formData.pais || 'PT'}
                        tipo={formData.tipo || 'apartamento'}
                        config={config}
                      />
                   </div>
                </div>
              </div>
            )}

            {/* Step 5: Fotos */}
            {step === 5 && (
               <div className="space-y-6 animate-fade-in">
                  <div className="border-b border-border-light pb-4 mb-6">
                    <h2 className="text-xl font-bold text-text-primary">Gestão de Fotos</h2>
                    <p className="text-text-secondary text-sm">A primeira foto será a capa do imóvel.</p>
                 </div>

                 <PhotoUploadZone 
                   imovelId={formData.id} 
                   onPhotosUploaded={(newPhotos) => {
                      const updatedPhotos = [...(formData.fotos || []), ...newPhotos];
                      // Se for a primeira foto, marca como capa
                      if (updatedPhotos.length === newPhotos.length) {
                        updatedPhotos[0].is_capa = true;
                      }
                      setFormData({ ...formData, fotos: updatedPhotos });
                   }} 
                 />

                 {/* Photo Grid */}
                 {formData.fotos && formData.fotos.length > 0 && (
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                     {formData.fotos.map((foto, idx) => (
                       <div key={foto.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-border bg-surface-alt shadow-sm hover:shadow-md transition-all">
                         <img 
                           src={foto.url_thumb} 
                           alt={`Foto ${idx + 1}`} 
                           className="w-full h-full object-cover"
                         />
                         
                         {/* Labels */}
                         {foto.is_capa && (
                           <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-white text-[8px] font-black uppercase rounded-md shadow-lg">
                             Capa
                           </div>
                         )}

                         {/* Actions Overlay */}
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                           <button
                             type="button"
                             onClick={() => {
                               const updated = (formData.fotos || []).map(f => ({
                                 ...f,
                                 is_capa: f.id === foto.id
                               }));
                               setFormData({ ...formData, fotos: updated });
                             }}
                             className={`p-2 rounded-lg transition-all ${foto.is_capa ? 'bg-amber-400 text-white' : 'bg-white/20 text-white hover:bg-white/40'}`}
                             title="Definir como capa"
                           >
                             {foto.is_capa ? <IoStar size={16} /> : <IoStarOutline size={16} />}
                           </button>
                           
                           <button
                             type="button"
                             onClick={() => {
                               const updated = (formData.fotos || []).filter(f => f.id !== foto.id);
                               // Se removeu a capa, marca a primeira restante como capa
                               if (foto.is_capa && updated.length > 0) {
                                 updated[0].is_capa = true;
                               }
                               setFormData({ ...formData, fotos: updated });
                             }}
                             className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-lg"
                             title="Excluir foto"
                           >
                             <IoTrash size={16} />
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}

                 <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 items-start">
                    <span className="text-lg">⚠️</span>
                    <p className="text-xs text-amber-800 leading-tight">
                       <strong>Atenção:</strong> Imóveis com menos de 5 fotos profissionais têm 70% menos chances de converter um lead. Tente carregar fotos de todos os ângulos.
                    </p>
                 </div>
               </div>
            )}

          </div>

          {/* Footer Navigation */}
          <div className="p-6 border-t border-border-light bg-surface-alt/30 flex justify-between items-center shrink-0">
             <button 
               type="button" 
               onClick={prevStep}
               disabled={step === 1}
               className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${step === 1 ? 'opacity-0' : 'hover:bg-white text-text-primary border border-border-light'}`}
             >
               Voltar
             </button>

             <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => router.back()}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-text-secondary hover:text-text-primary transition-all"
                >
                   Sair sem salvar
                </button>
                {step < STEPS.length ? (
                   <button 
                     type="button" 
                     onClick={nextStep}
                     className="px-8 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                   >
                     Próximo passo
                   </button>
                ) : (
                   <button 
                     type="button" 
                     onClick={handleSave}
                     disabled={loading}
                     className="px-8 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                   >
                     {loading ? 'Salvando...' : 'Finalizar Cadastro'}
                   </button>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
