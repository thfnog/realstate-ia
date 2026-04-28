'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { IoDiamondOutline } from 'react-icons/io5';
import UsuariosPage from '../usuarios/page';
import CorretoresPage from '../corretores/page';

export default function EquipePage() {
  const [activeTab, setActiveTab] = useState<'consultores' | 'usuarios'>('consultores');
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/imobiliaria')
      .then(res => res.json())
      .then(data => {
        setPlan(data.active_plan || 'Essencial');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (plan?.toLowerCase() === 'essencial') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in">
        <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary mb-8 animate-bounce">
          <IoDiamondOutline size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter text-center">Gestão de Equipe Independente</h2>
        <p className="text-slate-500 font-medium text-center max-w-md mt-4 leading-relaxed">
          O seu plano atual (<strong>Essencial</strong>) é focado em corretores independentes e permite apenas 1 usuário. 
          Para adicionar colaboradores e gerenciar um time, faça o upgrade agora.
        </p>
        <Link 
          href="/admin/config/plano" 
          className="mt-10 px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-primary/20 active:scale-95"
        >
          🚀 Ver Planos Disponíveis
        </Link>
      </div>
    );
  }

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
