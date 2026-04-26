'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { IoCloudUploadOutline, IoDocumentAttachOutline, IoCheckmarkCircle, IoInformationCircleOutline, IoChevronForwardOutline } from 'react-icons/io5';
import { toast } from 'sonner';
import { PropostaAluguel } from '@/lib/database.types';
import { formatCurrency, getConfig } from '@/lib/countryConfig';

export default function TenantDocumentsPage() {
  const { id } = useParams();
  const [proposta, setProposta] = useState<PropostaAluguel | null>(null);
  const [loading, setLoading] = useState(true);
  const config = getConfig();

  const requiredDocs = [
    { type: 'identidade', label: 'Documento de Identidade', desc: 'RG, CNH ou Passaporte (Frente e Verso)' },
    { type: 'cpf', label: 'CPF', desc: 'Caso não conste no documento de identidade' },
    { type: 'renda', label: 'Comprovante de Renda', desc: 'Últimos 3 holerites ou declaração de IR' },
    { type: 'residencia', label: 'Comprovante de Residência', desc: 'Conta de luz, água ou telefone recente' },
  ];

  useEffect(() => {
    if (id) fetchProposta();
  }, [id]);

  async function fetchProposta() {
    try {
      const res = await fetch(`/api/public/propostas/${id}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProposta(data);
    } catch (err: any) {
      toast.error('Erro ao carregar proposta: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleUpload = async (type: string) => {
    // Simulando upload para demonstração do workflow
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: `Enviando ${type}...`,
        success: () => {
          // Aqui faríamos o fetch real para a API de upload
          return `${type} enviado com sucesso!`;
        },
        error: 'Erro no upload'
      }
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-primary animate-pulse uppercase tracking-widest">Carregando...</div>;
  if (!proposta) return <div className="min-h-screen flex items-center justify-center font-black text-rose-500 uppercase tracking-widest">Proposta não encontrada</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 md:py-20">
      
      {/* Container */}
      <div className="w-full max-w-2xl space-y-8 animate-fade-in">
        
        {/* Header de Sucesso (Se já enviou algo ou acabou de chegar) */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <IoCheckmarkCircle size={120} className="text-primary" />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Proposta em Andamento
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Quase lá, {proposta.inquilino_nome.split(' ')[0]}!</h1>
            <p className="text-slate-500 font-medium leading-relaxed">
              Sua proposta para o imóvel <span className="text-slate-900 font-black">#{proposta.imovel?.referencia}</span> foi recebida. 
              Para iniciar a análise de crédito, precisamos de alguns documentos.
            </p>
          </div>
        </div>

        {/* Resumo da Proposta */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Proposto</p>
             <p className="text-xl font-black text-slate-900">{formatCurrency(proposta.valor_proposto, config)}</p>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Garantia</p>
             <p className="text-xl font-black text-slate-900 uppercase">{proposta.garantia_pretendida?.replace('_', ' ')}</p>
           </div>
        </div>

        {/* Lista de Documentos */}
        <div className="space-y-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-6">Documentos Necessários</h2>
          {requiredDocs.map((doc, index) => (
            <div key={index} className="bg-white group p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-primary/10 transition-all">
                  <IoDocumentAttachOutline size={24} className="text-slate-400 group-hover:text-primary transition-all" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 tracking-tight">{doc.label}</h3>
                  <p className="text-xs text-slate-400 font-medium">{doc.desc}</p>
                </div>
              </div>
              
              <button 
                onClick={() => handleUpload(doc.label)}
                className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-slate-900/10"
              >
                <IoCloudUploadOutline size={16} /> Enviar Arquivo
              </button>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="bg-blue-50 p-6 rounded-3xl flex gap-4 border border-blue-100">
          <IoInformationCircleOutline size={24} className="text-blue-500 shrink-0" />
          <p className="text-xs text-blue-700 font-medium leading-relaxed">
            Seus dados estão protegidos por criptografia de ponta a ponta e serão utilizados exclusivamente para fins de análise cadastral imobiliária.
          </p>
        </div>

        <div className="flex justify-center pt-8">
           <button className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-all group">
             Ver status detalhado da minha proposta <IoChevronForwardOutline className="group-hover:translate-x-1 transition-all" />
           </button>
        </div>

      </div>
    </div>
  );
}
