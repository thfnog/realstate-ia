'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Imovel } from '@/lib/database.types';
import { getConfigByCode, CountryConfig } from '@/lib/countryConfig';
import ImovelDetalhesView from '@/components/imoveis/ImovelDetalhesView';

export default function ImovelViewPage() {
  const router = useRouter();
  const params = useParams();
  const [imovel, setImovel] = useState<Imovel | null>(null);
  const [config, setConfig] = useState<CountryConfig | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      // Fetch Property
      const res = await fetch(`/api/imoveis/${params.id}`);
      if (!res.ok) throw new Error('Não encontrado');
      const data = await res.json();
      setImovel(data);

      // Fetch Global Config (to ensure currency/terminology is correct)
      const configRes = await fetch('/api/imobiliaria');
      const configData = await configRes.json();
      if (configData && configData.config_pais) {
         setConfig(getConfigByCode(configData.config_pais));
      } else {
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

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este imóvel?')) return;
    try {
      const res = await fetch(`/api/imoveis/${params.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin/imoveis');
        router.refresh();
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  }

  if (loading) return <div className="p-20 text-center animate-pulse text-text-secondary font-bold">Carregando apresentação do imóvel...</div>;
  if (!imovel || !config) return <div className="p-20 text-center text-rose-500 font-bold">Imóvel não encontrado.</div>;

  return (
    <ImovelDetalhesView 
      imovel={imovel} 
      config={config} 
      onDelete={handleDelete}
    />
  );
}
