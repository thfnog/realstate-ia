'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Imovel } from '@/lib/database.types';
import { getConfigByCode, CountryConfig } from '@/lib/countryConfig';
import ImovelDetalhesView from '@/components/imoveis/ImovelDetalhesView';
import Link from 'next/link';

export default function PublicImovelViewPage() {
  const params = useParams();
  const [imovel, setImovel] = useState<Imovel | null>(null);
  const [onDutyBroker, setOnDutyBroker] = useState<{ nome: string; telefone: string } | null>(null);
  const [config, setConfig] = useState<CountryConfig | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      // Fetch Property
      const res = await fetch(`/api/imoveis/${params.id}`);
      if (!res.ok) throw new Error('Não encontrado');
      const data = await res.json();
      setImovel(data);
      const imobId = data.imobiliaria_id;

      // 2. Fetch Public Config & On-Duty Broker (No Auth required)
      const configRes = await fetch(`/api/public/config/${imobId}`);
      if (configRes.ok) {
        const publicData = await configRes.json();
        setConfig(getConfigByCode(publicData.config.config_pais));
        setOnDutyBroker(publicData.onDutyBroker);
      } else {
        // Fallback for UI if public API fails
        setConfig(getConfigByCode(data.pais || 'PT'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [params.id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-text-secondary font-bold animate-pulse">Carregando detalhes do imóvel...</p>
      </div>
    </div>
  );

  if (!imovel || !config) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-border-light text-center space-y-6">
        <div className="text-6xl">🏠</div>
        <h1 className="text-2xl font-black text-text-primary">Imóvel não encontrado</h1>
        <p className="text-text-secondary">O link que você acessou pode estar expirado ou o imóvel não está mais disponível.</p>
        <Link href="/" className="inline-block px-8 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover transition-all">
          Voltar para Início
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Client Header / Brand */}
      <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">i</div>
          <span className="text-xl font-black text-text-primary tracking-tighter">ImobIA</span>
        </div>
        <a 
          href={`https://wa.me/${onDutyBroker?.telefone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(`Olá! Gostaria de mais informações sobre o imóvel: ${imovel.titulo || 'Deste anúncio'}${imovel.referencia ? ` (Ref: ${imovel.referencia})` : ''} - Link: ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
          target="_blank"
          className="px-6 py-3 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <span>💬</span> Falar com {onDutyBroker?.nome || 'Consultor'}
        </a>
      </div>

      <ImovelDetalhesView 
        imovel={imovel} 
        config={config} 
        isAdmin={false} // Force public mode
      />

      {/* Footer Disclaimer */}
      <div className="max-w-7xl mx-auto mt-12 py-12 border-t border-border-light text-center space-y-2">
        <p className="text-sm font-bold text-text-tertiary">Solicite uma visita para ver o endereço completo.</p>
        <p className="text-xs text-text-tertiary">© 2026 ImobIA — Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
