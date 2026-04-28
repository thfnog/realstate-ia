'use client';

import { useState } from 'react';
import UsuariosPage from '../usuarios/page';
import CorretoresPage from '../corretores/page';

export default function EquipePage() {
  const [activeTab, setActiveTab] = useState<'consultores' | 'usuarios'>('consultores');

  return (
    <div className="animate-fade-in pb-20 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Gestão da Equipe</h1>
          <p className="text-slate-500 font-medium text-lg max-w-xl">
            Gerencie seus consultores, controle acessos e permissões administrativas em um só lugar.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200">
          <button
            onClick={() => setActiveTab('consultores')}
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'consultores' 
                ? 'bg-white text-primary shadow-lg shadow-slate-200' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            🤝 Consultores
          </button>
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'usuarios' 
                ? 'bg-white text-primary shadow-lg shadow-slate-200' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            👤 Usuários & Acessos
          </button>
        </div>
      </div>

      <div className="animate-fade-in transition-all">
        {activeTab === 'consultores' ? <CorretoresPage hideHeader /> : <UsuariosPage hideHeader />}
      </div>
    </div>
  );
}
