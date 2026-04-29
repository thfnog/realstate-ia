'use client';

import { useEffect, useState } from 'react';
import { Lead, Imovel } from '@/lib/database.types';

interface ImovelMatchingLeadsProps {
  imovel: Imovel;
}

export default function ImovelMatchingLeads({ imovel }: ImovelMatchingLeadsProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await fetch('/api/leads');
        const result = await res.json();
        const allLeads: Lead[] = result.data || [];
        
        // Logic de Matching
        const matches = allLeads.filter(lead => {
          // 1. Tipo correspondente (se especificado no lead)
          if (lead.tipo_interesse && lead.tipo_interesse.toLowerCase() !== imovel.tipo.toLowerCase()) {
            return false;
          }
          
          // 2. Orçamento compatível (lead pode pagar o valor ou um pouco mais/menos)
          // Se o lead não tem orçamento definido, consideramos possível match
          if (lead.orcamento && lead.orcamento < (imovel.valor * 0.9)) {
            return false;
          }
          
          // 3. Quartos (imóvel deve ter pelo menos o que o lead quer)
          if (lead.quartos_interesse && (imovel.quartos ?? 0) < lead.quartos_interesse) {
            return false;
          }

          return true;
        });

        setLeads(matches);
      } catch (err) {
        console.error('Erro ao buscar matching de leads:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, [imovel.id]);

  if (loading) return <div className="animate-pulse h-20 bg-surface-alt rounded-2xl"></div>;
  if (leads.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-3xl border border-border-light shadow-sm space-y-4 no-print">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest flex items-center gap-2">
          <span>🎯</span> {leads.length} Leads compatíveis
        </h3>
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
          Oportunidade Comercial
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {leads.slice(0, 4).map(lead => (
          <div key={lead.id} className="flex items-center justify-between p-3 rounded-2xl bg-surface-alt border border-transparent hover:border-primary/20 transition-all cursor-default">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] text-white font-bold">
                {lead.nome.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary">{lead.nome}</p>
                <p className="text-[9px] text-text-muted capitalize">{lead.status.replace('_', ' ')}</p>
              </div>
            </div>
            <a 
              href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(
                `Olá ${lead.nome}! Encontrei um imóvel que combina perfeitamente com o que você procura: *${imovel.titulo}${imovel.referencia ? ` (Ref: ${imovel.referencia})` : ''}*.\n\nConfira os detalhes aqui:\n${typeof window !== 'undefined' ? window.location.origin : ''}/imoveis/${imovel.id}`
              )}`} 
              target="_blank" 
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[10px] font-bold hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md active:scale-95"
              title="Enviar imóvel via WhatsApp"
            >
              <span className="text-xs">💬</span>
              <span>Enviar Imóvel</span>
            </a>
          </div>
        ))}
      </div>
      
      {leads.length > 4 && (
        <p className="text-[10px] text-center text-text-muted italic">e mais {leads.length - 4} leads encontrados...</p>
      )}
    </div>
  );
}
