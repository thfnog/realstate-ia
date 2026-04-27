'use client';

import { useState, useEffect } from 'react';
import { IoBusinessOutline, IoCheckmarkCircle, IoCloseCircle, IoInformationCircleOutline, IoSearchOutline, IoFilterOutline, IoCalendarOutline } from 'react-icons/io5';
import { LoadingSkeleton, TableRowSkeleton } from '@/components/LoadingSkeleton';
import { toast } from 'sonner';

interface Imobiliaria {
  id: string;
  nome_fantasia: string;
  identificador_fiscal: string;
  numero_registro: string;
  config_pais: string;
  criado_em: string;
  assinaturas?: {
    status: string;
    periodo_inicio: string;
    periodo_fim?: string;
    planos: {
      nome: string;
      preco_mensal: number;
      limite_usuarios: number;
    };
  };
  user_count: number;
}

export default function MasterImobiliariasPage() {
  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchImobiliarias();
  }, []);

  async function fetchImobiliarias() {
    try {
      setLoading(true);
      const res = await fetch('/api/master/imobiliarias');
      const data = await res.json();
      if (Array.isArray(data)) setImobiliarias(data);
    } catch (error) {
      toast.error('Erro ao carregar imobiliárias');
    } finally {
      setLoading(false);
    }
  }

  const filtered = imobiliarias.filter(i => 
    i.nome_fantasia.toLowerCase().includes(search.toLowerCase()) || 
    i.identificador_fiscal.includes(search)
  );

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
              <IoBusinessOutline size={24} />
            </span>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Imobiliárias & Clientes</h1>
          </div>
          <p className="text-slate-500 font-medium">Controle total sobre as contas e assinaturas ativas na plataforma.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <IoSearchOutline className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Buscar por nome, CNPJ/NIF..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-14 pr-8 py-5 bg-white rounded-[1.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-slate-900"
          />
        </div>
        <button className="p-5 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-slate-900 transition-all shadow-xl shadow-slate-200/40">
          <IoFilterOutline size={24} />
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Imobiliária</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Documentação</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Plano Atual</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Usuários</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Cadastrada em</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))
              ) : filtered.map((imob) => (
                <tr key={imob.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6 border-b border-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs shadow-sm">
                        {imob.nome_fantasia.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 tracking-tight">{imob.nome_fantasia}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{imob.config_pais === 'PT' ? '🇵🇹 Portugal' : '🇧🇷 Brasil'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 border-b border-slate-50">
                    <p className="text-xs font-bold text-slate-700">{imob.identificador_fiscal}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Reg: {imob.numero_registro}</p>
                  </td>
                  <td className="px-8 py-6 border-b border-slate-50">
                    {(() => {
                      const sub = Array.isArray(imob.assinaturas) ? imob.assinaturas[0] : imob.assinaturas;
                      if (sub && sub.status === 'ativo') {
                        return (
                          <div>
                            <p className="text-xs font-black text-slate-900 uppercase tracking-widest">
                              {sub.planos?.nome || 'Plano Personalizado'}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              R$ {(sub.planos?.preco_mensal || 0).toLocaleString('pt-BR')}/mês
                            </p>
                          </div>
                        );
                      }
                      return <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest italic">Sem Assinatura</span>;
                    })()}
                  </td>
                  <td className="px-8 py-6 border-b border-slate-50">
                    {(() => {
                      const sub = Array.isArray(imob.assinaturas) ? imob.assinaturas[0] : imob.assinaturas;
                      const limit = sub?.planos?.limite_usuarios || 0;
                      const usage = imob.user_count || 0;
                      const percentage = limit > 0 ? (usage / limit) * 100 : 0;

                      return (
                        <div className="space-y-2 max-w-[120px]">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className={usage >= limit ? 'text-rose-500' : 'text-slate-900'}>{usage}</span>
                            <span className="text-slate-400">/ {limit}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${usage >= limit ? 'bg-rose-500' : 'bg-primary'}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-8 py-6 border-b border-slate-50 text-center">
                    {(() => {
                      const sub = Array.isArray(imob.assinaturas) ? imob.assinaturas[0] : imob.assinaturas;
                      const isActive = sub?.status === 'ativo';
                      return (
                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}>
                          {isActive ? <IoCheckmarkCircle size={14} /> : <IoInformationCircleOutline size={14} />}
                          {isActive ? 'Ativo' : 'Pendente'}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-8 py-6 border-b border-slate-50 text-right">
                    <p className="text-xs font-bold text-slate-700">{new Date(imob.criado_em).toLocaleDateString('pt-BR')}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
