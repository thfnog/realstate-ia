'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Imovel } from '@/lib/database.types';
import { CountryConfig, formatCurrency } from '@/lib/countryConfig';
import MercadoIndicador from './MercadoIndicador';
import MapPicker from './MapPicker';
import ImovelGaleria from './ImovelGaleria';
import { IoClose } from 'react-icons/io5';

interface ImovelDetalhesViewProps {
  imovel: Imovel;
  config: CountryConfig;
  onDelete?: () => void;
  isAdmin?: boolean;
}

export default function ImovelDetalhesView({ imovel, config, onDelete, isAdmin = true }: ImovelDetalhesViewProps) {
  const [activePhoto, setActivePhoto] = useState(0);

  const stats = [
    { label: config.terminology.quartosLabel, value: imovel.quartos, icon: '🛏️' },
    { label: 'Suítes', value: imovel.suites, icon: '🚿' },
    { label: 'Vagas', value: imovel.vagas_garagem, icon: '🚗' },
    { label: 'Área Útil', value: `${imovel.area_util || '—'} m²`, icon: '📐' },
  ];

  function handleShareWhatsApp() {
    const propertyUrl = typeof window !== 'undefined' ? `${window.location.origin}/imoveis/${imovel.id}` : '';
    const message = `Olá! Gostaria de compartilhar este imóvel que combina com seu perfil:\n\n🏠 *${imovel.titulo || 'Imóvel Selecionado'}*\n📍 ${imovel.freguesia || ''}, ${imovel.concelho || ''}\n💰 *${formatCurrency(imovel.valor, config)}*\n🛏️ ${imovel.quartos || '—'} qts | 📐 ${imovel.area_util || '—'}m²\n\nConfira todos os detalhes aqui:\n🔗 ${propertyUrl}\n\nFico à disposição para agendarmos uma visita!`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }

  function handleGeneratePDF() {
    window.print();
  }

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
          <h1 className="text-3xl font-black text-text-primary tracking-tight mt-2">{imovel.titulo || 'Detalhes do Imóvel'}</h1>
          <p className="text-text-secondary flex items-center gap-2">
             <span className="text-lg">📍</span> 
             {isAdmin ? (
               <>{imovel.rua}{imovel.numero ? `, ${imovel.numero}` : ''} • {imovel.freguesia}, {imovel.concelho}</>
             ) : (
               <>{[imovel.freguesia, imovel.concelho].filter(Boolean).join(', ')}</>
             )}
          </p>
        </div>

        {isAdmin && (
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
            <Link 
              href="/admin/imoveis"
              className="p-3 bg-white hover:bg-surface-alt text-text-secondary hover:text-text-primary rounded-2xl border border-border-light transition-all flex items-center justify-center"
              title="Fechar e voltar à lista"
            >
              <IoClose size={24} />
            </Link>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Gallery & Description (Left/Wide Columns) */}
        <div className="lg:col-span-2 space-y-8">
          
          <ImovelGaleria fotos={imovel.fotos || []} />

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

              {isAdmin && (
                <div className="mt-8 space-y-3">
                   <button 
                     onClick={handleGeneratePDF}
                     className="w-full py-4 rounded-2xl bg-primary text-white font-black hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
                   >
                      Gerar PDF para Cliente
                   </button>
                   <button 
                     onClick={handleShareWhatsApp}
                     className="w-full py-4 rounded-2xl bg-white text-text-primary border-2 border-border-light font-black hover:bg-surface-alt transition-all"
                   >
                      Compartilhar via WhatsApp
                   </button>
                </div>
              )}
           </div>

           {/* Small Map Card */}
           <div className="bg-white p-6 rounded-3xl border border-border-light shadow-sm space-y-4">
              <h2 className="text-sm font-black text-text-primary tracking-widest uppercase">Localização</h2>
              <div className="rounded-2xl overflow-hidden border border-border-light">
                 <MapPicker 
                    lat={imovel.latitude}
                    lng={imovel.longitude}
                    onChange={() => {}} // Read only here
                    address={isAdmin ? `${imovel.rua}, ${imovel.concelho}` : `${imovel.freguesia}, ${imovel.concelho}`}
                    isAdmin={isAdmin}
                 />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
