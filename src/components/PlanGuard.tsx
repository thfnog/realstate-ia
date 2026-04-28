'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IoLockClosedOutline, IoArrowForwardOutline } from 'react-icons/io5';

interface PlanGuardProps {
  requiredModule?: string;
  minPlan?: 'essencial' | 'profissional' | 'enterprise';
  children: React.ReactNode;
}

const PLAN_LEVELS = {
  'essencial': 1,
  'profissional': 2,
  'enterprise': 3
};

export function PlanGuard({ requiredModule, minPlan, children }: PlanGuardProps) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [activePlan, setActivePlan] = useState('');

  useEffect(() => {
    fetch('/api/imobiliaria')
      .then(res => res.json())
      .then(data => {
        let access = true;
        
        const currentPlan = (data.active_plan || 'essencial').toLowerCase();
        const currentModules = data.active_modules || [];

        if (requiredModule && !currentModules.includes(requiredModule)) {
          access = false;
        }

        if (minPlan) {
          const currentLevel = PLAN_LEVELS[currentPlan as keyof typeof PLAN_LEVELS] || 1;
          const requiredLevel = PLAN_LEVELS[minPlan] || 1;
          if (currentLevel < requiredLevel) {
            access = false;
          }
        }

        setHasAccess(access);
        setActivePlan(data.active_plan || 'Essencial');
        setLoading(false);
      });
  }, [requiredModule, minPlan]);

  if (loading) return (
    <div className="p-20 text-center animate-pulse flex flex-col items-center">
      <div className="w-16 h-16 bg-slate-100 rounded-[1.5rem] mb-6" />
      <div className="h-4 bg-slate-100 w-48 rounded-full mb-3" />
      <div className="h-3 bg-slate-50 w-32 rounded-full" />
    </div>
  );

  if (!hasAccess) {
    const resourceName = requiredModule 
      ? requiredModule.toUpperCase() 
      : (minPlan === 'profissional' ? 'EQUIPE & GESTÃO' : 'RECURSO AVANÇADO');

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-10 animate-fade-in">
        <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-primary mb-8 shadow-xl shadow-primary/5 border border-indigo-100">
          <IoLockClosedOutline size={40} />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter text-center max-w-md">
          Acesso Restrito
        </h1>
        <p className="text-slate-500 font-medium text-center mt-4 max-w-lg leading-relaxed">
          O acesso à área de <span className="text-primary font-black uppercase tracking-tight">{resourceName}</span> requer o plano <span className="font-black text-slate-900 uppercase">{minPlan || 'Profissional'}</span> ou superior.
          <br /><br />
          Seu plano atual: <span className="px-3 py-1 bg-slate-100 rounded-lg font-black text-slate-600 text-xs">{activePlan}</span>
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-12 w-full max-w-md">
          <Link 
            href="/admin/config/plano" 
            className="flex-1 px-10 py-5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/30 hover:bg-slate-900 hover:shadow-slate-900/20 transition-all flex items-center justify-center gap-2"
          >
            Fazer Upgrade <IoArrowForwardOutline size={18} />
          </Link>
          <Link 
            href="/admin" 
            className="flex-1 px-10 py-5 bg-white text-slate-400 border border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center"
          >
            Voltar ao Início
          </Link>
        </div>
        
        <div className="mt-20 p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] max-w-2xl w-full relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <IoLockClosedOutline size={120} />
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Por que fazer o upgrade?</p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {[
                "Desbloqueie todos os módulos",
                "Gestão de equipe ilimitada",
                "Relatórios de performance",
                "Suporte prioritário 24/7",
                "Automação de leads avançada",
                "Customização total da marca"
              ].map(b => (
                <div key={b} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center text-[10px] font-black">✓</span>
                  <span className="text-[11px] font-bold text-slate-700">{b}</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
