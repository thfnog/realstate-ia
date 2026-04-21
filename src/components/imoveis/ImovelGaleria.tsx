'use client';

import { useState } from 'react';
import { ImovelFoto } from '@/lib/database.types';
import { IoClose, IoChevronBack, IoChevronForward, IoGridOutline } from 'react-icons/io5';

interface ImovelGaleriaProps {
  fotos: ImovelFoto[];
}

export default function ImovelGaleria({ fotos = [] }: ImovelGaleriaProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const openViewer = (index: number) => setViewerIndex(index);
  const closeViewer = () => setViewerIndex(null);
  
  const nextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (viewerIndex === null) return;
    setViewerIndex((viewerIndex + 1) % fotos.length);
  };

  const prevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (viewerIndex === null) return;
    setViewerIndex((viewerIndex - 1 + fotos.length) % fotos.length);
  };

  if (!fotos || fotos.length === 0) {
    return (
      <div className="w-full aspect-[21/9] bg-surface-alt rounded-3xl border-2 border-dashed border-border-light flex flex-col items-center justify-center text-text-tertiary">
        <span className="text-5xl mb-4">📸</span>
        <p className="font-bold">Nenhuma foto disponível para este imóvel</p>
      </div>
    );
  }

  const renderGrid = () => {
    const num = fotos.length;

    // Layout: 1 Photo
    if (num === 1) {
      return (
        <div 
          className="w-full aspect-[21/9] rounded-3xl overflow-hidden cursor-pointer group"
          onClick={() => openViewer(0)}
        >
          <img src={fotos[0].url_media} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" alt="Imóvel" />
        </div>
      );
    }

    // Layout: 2 Photos
    if (num === 2) {
      return (
        <div className="grid grid-cols-2 gap-4 aspect-[21/9]">
          {fotos.map((f, i) => (
            <div key={f.id} className="rounded-3xl overflow-hidden cursor-pointer group" onClick={() => openViewer(i)}>
              <img src={f.url_media} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" alt={`Foto ${i+1}`} />
            </div>
          ))}
        </div>
      );
    }

    // Layout: 3-4 Photos
    if (num >= 3 && num <= 4) {
      return (
        <div className="grid grid-cols-3 gap-4 aspect-[21/9]">
          <div className="col-span-2 rounded-3xl overflow-hidden cursor-pointer group" onClick={() => openViewer(0)}>
            <img src={fotos[0].url_media} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" alt="Principal" />
          </div>
          <div className="flex flex-col gap-4">
            {fotos.slice(1, num).map((f, i) => (
              <div key={f.id} className="flex-1 rounded-3xl overflow-hidden cursor-pointer group" onClick={() => openViewer(i + 1)}>
                <img src={f.url_media} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" alt={`Foto ${i+2}`} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Layout: 5+ Photos (Airbnb Style)
    return (
      <div className="grid grid-cols-4 gap-4 h-[500px]">
        <div 
          className="col-span-2 row-span-2 rounded-3xl overflow-hidden cursor-pointer group"
          onClick={() => openViewer(0)}
        >
          <img src={fotos[0].url_media} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" alt="Principal" />
        </div>
        {fotos.slice(1, 5).map((f, i) => (
          <div 
            key={f.id} 
            className="rounded-3xl overflow-hidden cursor-pointer group relative"
            onClick={() => openViewer(i + 1)}
          >
            <img src={f.url_media} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" alt={`Foto ${i+2}`} />
            {i === 3 && num > 5 && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-100 group-hover:bg-black/40 transition-all">
                <span className="text-2xl font-black">+{num - 5}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Ver Todas</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="relative">
      {renderGrid()}

      {/* View All Button (Visible on all layouts except single photo/empty) */}
      {fotos.length > 1 && (
        <button 
          onClick={() => openViewer(0)}
          className="absolute bottom-6 right-6 px-4 py-2 bg-white/90 backdrop-blur-md rounded-xl border border-border-light shadow-lg text-text-primary text-xs font-black flex items-center gap-2 hover:bg-white hover:scale-105 transition-all active:scale-95 z-10"
        >
          <IoGridOutline size={16} />
          MOSTRAR TODAS AS FOTOS
        </button>
      )}

      {/* Lightbox Viewer */}
      {viewerIndex !== null && (
        <div 
          className="fixed inset-0 bg-black/95 z-[9999] flex flex-col animate-fade-in"
          onClick={closeViewer}
        >
          {/* Top Bar */}
          <div className="p-6 flex justify-between items-center text-white">
            <div className="font-bold text-sm tracking-widest">
              {viewerIndex + 1} / {fotos.length}
            </div>
            <button 
              onClick={closeViewer}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"
            >
              <IoClose size={24} />
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-between px-4 md:px-20">
            <button 
              onClick={prevPhoto}
              className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all disabled:opacity-20"
              disabled={fotos.length <= 1}
            >
              <IoChevronBack size={32} />
            </button>

            <div className="max-w-5xl max-h-[80vh] flex items-center justify-center p-4">
              <img 
                src={fotos[viewerIndex].url_media} 
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-scale-in"
                alt="Visualização"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <button 
              onClick={nextPhoto}
              className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all disabled:opacity-20"
              disabled={fotos.length <= 1}
            >
              <IoChevronForward size={32} />
            </button>
          </div>

          {/* Bottom Thumbnails */}
          <div className="p-8 flex justify-center gap-2 overflow-x-auto no-scrollbar">
            {fotos.map((f, i) => (
              <div 
                key={f.id}
                onClick={(e) => { e.stopPropagation(); setViewerIndex(i); }}
                className={`w-20 h-14 rounded-lg overflow-hidden cursor-pointer border-2 transition-all shrink-0 ${viewerIndex === i ? 'border-primary scale-110 shadow-lg shadow-primary/30' : 'border-transparent opacity-40 hover:opacity-100'}`}
              >
                <img src={f.url_thumb} className="w-full h-full object-cover" alt={`Thumb ${i+1}`} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
