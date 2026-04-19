'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ImovelForm from '@/components/imoveis/ImovelForm';
import { Imovel } from '@/lib/database.types';

export default function EditarImovelPage() {
  const router = useRouter();
  const params = useParams();
  const [imovel, setImovel] = useState<Imovel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/imoveis/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setImovel(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) return <div className="p-20 text-center animate-pulse">Carregando dados para edição...</div>;
  if (!imovel) return <div className="p-20 text-center">Imóvel não encontrado.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-text-primary">Editar Imóvel</h1>
          <p className="text-text-secondary text-sm">Ajuste os detalhes técnicos e financeiros da referência {imovel.referencia}.</p>
        </div>
      </div>

      <ImovelForm 
        initialData={imovel}
        onSuccess={() => {
          router.push(`/admin/imoveis/${imovel.id}`);
          router.refresh();
        }} 
      />
    </div>
  );
}
