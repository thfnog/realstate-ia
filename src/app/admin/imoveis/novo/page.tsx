'use client';

import { useRouter } from 'next/navigation';
import ImovelForm from '@/components/imoveis/ImovelForm';

export default function NovoImovelPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Cadastrar Imóvel</h1>
          <p className="text-text-secondary text-sm">Preencha os detalhes para adicionar um novo imóvel à carteira.</p>
        </div>
      </div>

      <ImovelForm 
        onSuccess={() => {
          router.push('/admin/imoveis');
          router.refresh();
        }} 
      />
    </div>
  );
}
