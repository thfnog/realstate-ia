'use client';

import { useState, useEffect } from 'react';
import { IoCheckmarkCircle, IoDiamondOutline, IoRocketOutline, IoBriefcaseOutline, IoInformationCircleOutline } from 'react-icons/io5';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { toast } from 'sonner';

interface Plano {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  preco_mensal: number;
  modulos: string[];
}

export default function AgencyPlansPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPlanSlug, setCurrentPlanSlug] = useState('essencial');

  useEffect(() => {
    fetch('/api/master/planos') // Reusing the same fetch, though usually agencies see a public/limited list
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPlanos(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch current imobiliaria plan
    fetch('/api/imobiliaria')
      .then(res => res.json())
      .then(data => {
        if (data.plano) setCurrentPlanSlug(data.plano);
      });
  }, []);

  const getIcon = (slug: string) => {
    if (slug.includes('enterprise')) return <IoDiamondOutline size={32} />;
    if (slug.includes('profissional')) return <IoRocketOutline size={32} />;
    return <IoBriefcaseOutline size={32} />;
  };

  return (
    <div className="animate-fade-in space-y-12 pb-20 max-w-6xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Escolha o seu Plano</h1>
        <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
          Escale sua imobiliária com inteligência artificial e ferramentas de gestão profissional.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <LoadingSkeleton className="h-[500px] rounded-[3rem]" />
          <LoadingSkeleton className="h-[500px] rounded-[3rem]" />
          <LoadingSkeleton className="h-[500px] rounded-[3rem]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {planos.map((plano) => {
            const isCurrent = currentPlanSlug === plano.slug;
            const isEnterprise = plano.slug.includes('enterprise');

            return (
              <div 
                key={plano.id}
                className={`relative flex flex-col p-10 rounded-[3rem] border transition-all duration-500 hover:scale-[1.02] ${
                  isCurrent 
                    ? 'bg-white border-primary shadow-2xl shadow-primary/20 ring-4 ring-primary/5' 
                    : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                    Plano Atual
                  </div>
                )}

                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 ${isCurrent ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-50 text-slate-400'}`}>
                  {getIcon(plano.slug)}
                </div>

                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{plano.nome}</h3>
                <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed h-12 overflow-hidden">{plano.descricao}</p>

                <div className="mb-10">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">R$ {plano.preco_mensal.toLocaleString('pt-BR')}</span>
                  <span className="text-slate-400 font-bold text-sm tracking-widest ml-2 uppercase">/mês</span>
                </div>

                <div className="flex-1 space-y-4 mb-10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">O que está incluído:</p>
                  {plano.modulos.map((m) => (
                    <div key={m} className="flex items-center gap-3">
                      <IoCheckmarkCircle className="text-emerald-500 shrink-0" size={18} />
                      <span className="text-sm font-bold text-slate-700 capitalize">Módulo {m}</span>
                    </div>
                  ))}
                </div>

                <button 
                  disabled={isCurrent}
                  className={`w-full py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                    isCurrent 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : isEnterprise 
                        ? 'bg-slate-900 text-white hover:bg-primary shadow-xl shadow-slate-900/10' 
                        : 'bg-primary text-white hover:bg-slate-900 shadow-xl shadow-primary/20'
                  }`}
                >
                  {isCurrent ? 'Utilizando este Plano' : 'Assinar Agora'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100 flex items-start gap-6">
        <IoInformationCircleOutline className="text-indigo-600 shrink-0" size={28} />
        <div>
          <p className="text-indigo-900 font-black text-sm uppercase tracking-widest mb-2">Suporte Prioritário</p>
          <p className="text-indigo-700/70 text-sm font-medium leading-relaxed">
            Precisa de um plano customizado para mais de 50 corretores? Entre em contato com o nosso time de especialistas para uma oferta sob medida.
          </p>
        </div>
      </div>
    </div>
  );
}
