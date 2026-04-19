'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Imovel } from '@/lib/database.types';
import { CountryConfig, formatCurrency } from '@/lib/countryConfig';
import MercadoIndicador from './MercadoIndicador';
import MapPicker from './MapPicker'; // MapPicker already has a ReadOnly style or can be adapted

interface ImovelDetalhesViewProps {
  imovel: Imovel;
  config: CountryConfig;
  onDelete: () => void;
}

export default function ImovelDetalhesView({ imovel, config, onDelete }: ImovelDetalhesViewProps) {
  const [activePhoto, setActivePhoto] = useState(0);

  const stats = [
    { label: config.terminology.quartosLabel, value: imovel.quartos, icon: '🛏️' },
    { label: 'Suítes', value: imovel.suites, icon: '🚿' },
    { label: 'Vagas', value: imovel.vagas_garagem, icon: '🚗' },
    { label: 'Área Útil', value: `${imovel.area_util || '—'} m²`, icon: '📐' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-border-light shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <span className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                {imovel.referencia}
             </span>
             <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                imovel.status === 'disponivel' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
             }`}>
                {imovel.status}
             </span>
          </div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight mt-2">{imovel.titulo}</h1>
          <p className="text-text-secondary flex items-center gap-2">
             <span className="text-lg">📍</span> {imovel.rua}{imovel.numero ? `, ${imovel.numero}` : ''} • {imovel.freguesia}, {imovel.concelho}
          </p>
        </div>
        <div className="flex gap-3">
           <Link 
             href={`/admin/imoveis/${imovel.id}/editar`}
             className="px-6 py-3 rounded-2xl bg-surface-alt hover:bg-surface-hover text-text-primary font-bold transition-all border border-border-light flex items-center gap-2"
           >
             <span>✏️</span> Editar Dados
           </Link>
           <button 
             onClick={onDelete}
             className="px-6 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition-all border border-rose-200 flex items-center gap-2"
           >
             <span>🗑️</span> Excluir
           </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Gallery & Description (Left/Wide Columns) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Photos Grid Style "Airbnb" */}
          <div className="grid grid-cols-4 gap-4 h-[500px]">
             <div className="col-span-2 row-span-2 rounded-3xl overflow-hidden bg-surface-alt border border-border-light shadow-sm group relative">
                <img 
                  src={imovel.fotos && imovel.fotos.length > 0 ? imovel.fotos[0].url_media : 'https://placehold.co/800x600?text=Sem+Foto'} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" 
                  alt="Principal"
                />
             </div>
             <div className="col-span-1 rounded-3xl overflow-hidden bg-surface-alt border border-border-light shadow-sm group">
                <img 
                  src={imovel.fotos && imovel.fotos.length > 1 ? imovel.fotos[1].url_media : 'https://placehold.co/400x300?text=Ambiente+2'} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" 
                  alt="Interiores"
                />
             </div>
             <div className="col-span-1 rounded-3xl overflow-hidden bg-surface-alt border border-border-light shadow-sm group">
                <img 
                  src={imovel.fotos && imovel.fotos.length > 2 ? imovel.fotos[2].url_media : 'https://placehold.co/400x300?text=Ambiente+3'} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" 
                  alt="Interiores"
                />
             </div>
             <div className="col-span-1 rounded-3xl overflow-hidden bg-surface-alt border border-border-light shadow-sm group">
                <img 
                  src={imovel.fotos && imovel.fotos.length > 3 ? imovel.fotos[3].url_media : 'https://placehold.co/400x300?text=Ambiente+4'} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" 
                  alt="Interiores"
                />
             </div>
             <div className="col-span-1 rounded-3xl overflow-hidden bg-surface-alt border border-border-light shadow-sm group relative">
                <img 
                  src={imovel.fotos && imovel.fotos.length > 4 ? imovel.fotos[4].url_media : 'https://placehold.co/400x300?text=Ver+Mais'} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" 
                  alt="Interiores"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="text-white font-black text-sm uppercase tracking-widest">Ver Todas</span>
                </div>
             </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {stats.map((s, i) => (
                <div key={i} className="bg-white p-5 rounded-3xl border border-border-light shadow-sm flex flex-col items-center text-center">
                   <span className="text-2xl mb-2">{s.icon}</span>
                   <p className="text-[10px] font-black text-text-secondary uppercase tracking-wider">{s.label}</p>
                   <p className="text-lg font-bold text-text-primary">{s.value || '—'}</p>
                </div>
             ))}
          </div>

          {/* About / Description */}
          <div className="bg-white p-8 rounded-3xl border border-border-light shadow-sm space-y-4">
             <h2 className="text-xl font-black text-text-primary uppercase tracking-tight">O que este lugar oferece</h2>
             <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">
                {imovel.descricao || 'Sem descrição detalhada disponível.'}
             </p>

             <div className="pt-6 border-t border-border-light">
                <h3 className="text-sm font-bold text-text-primary uppercase mb-4 tracking-widest">Comodidades</h3>
                <div className="flex flex-wrap gap-2">
                   {imovel.comodidades && imovel.comodidades.length > 0 ? imovel.comodidades.map(c => (
                      <span key={c} className="px-4 py-2 rounded-xl bg-surface-alt text-text-primary text-xs font-semibold border border-border-light">
                         ✨ {c}
                      </span>
                   )) : (
                      <p className="text-xs text-text-tertiary">Nenhuma comodidade especificada.</p>
                   )}
                </div>
             </div>
          </div>
        </div>

        {/* Financial & Location Info (Sidebar Column) */}
        <div className="space-y-8">
           {/* Pricing Card (Sticky style) */}
           <div className="bg-white p-8 rounded-3xl border border-border-light shadow-xl shadow-primary/5 sticky top-24">
              <div className="flex justify-between items-end mb-6">
                 <div>
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1">Preço Sugerido</p>
                    <p className="text-3xl font-black text-text-primary tracking-tighter">
                       {formatCurrency(imovel.valor, config)}
                    </p>
                 </div>
                 {imovel.aceita_permuta && (
                    <span className="bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-1 rounded-lg border border-sky-100">
                       Aceita Permuta
                    </span>
                 )}
              </div>

              <div className="space-y-4 pt-6 border-t border-border-light">
                 <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Condomínio</span>
                    <span className="font-bold text-text-primary">{formatCurrency(imovel.condominio_mensal || 0, config)}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">{config.code === 'BR' ? 'IPTU (Anual)' : 'IMI (Anual)'}</span>
                    <span className="font-bold text-text-primary">{formatCurrency(imovel.imi_iptu_anual || 0, config)}</span>
                 </div>
              </div>

              {/* Market Intelligence Box */}
              <div className="mt-8">
                 <MercadoIndicador 
                   valor={imovel.valor}
                   areaUtil={imovel.area_util || 0}
                   concelho={imovel.concelho || ''}
                   pais={imovel.pais as any}
                   tipo={imovel.tipo}
                   config={config}
                 />
              </div>

              <div className="mt-8 space-y-3">
                 <button className="w-full py-4 rounded-2xl bg-primary text-white font-black hover:bg-primary-hover transition-all shadow-lg shadow-primary/20">
                    Gerar PDF para Cliente
                 </button>
                 <button className="w-full py-4 rounded-2xl bg-white text-text-primary border-2 border-border-light font-black hover:bg-surface-alt transition-all">
                    Compartilhar via WhatsApp
                 </button>
              </div>
           </div>

           {/* Small Map Card */}
           <div className="bg-white p-6 rounded-3xl border border-border-light shadow-sm space-y-4">
              <h2 className="text-sm font-black text-text-primary tracking-widest uppercase">Localização</h2>
              <div className="rounded-2xl overflow-hidden border border-border-light">
                 <MapPicker 
                    lat={imovel.latitude}
                    lng={imovel.longitude}
                    onChange={() => {}} // Read only here
                    address={`${imovel.rua}, ${imovel.concelho}`}
                 />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
