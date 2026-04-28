'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { IoAddOutline, IoCheckmarkCircle, IoCloseCircle, IoCreateOutline, IoListOutline, IoSettingsOutline, IoDiamondOutline, IoArrowBackOutline } from 'react-icons/io5';
import { LoadingSkeleton, TableRowSkeleton } from '@/components/LoadingSkeleton';
import { toast } from 'sonner';

interface Plano {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  preco_mensal: number;
  modulos: string[];
  ativo: boolean;
}

const AVAILABLE_MODULES = [
  { id: 'crm', label: 'CRM & Leads' },
  { id: 'bot', label: 'Bot IA & WhatsApp' },
  { id: 'dashboard', label: 'Dashboard Analítico' },
  { id: 'inventario', label: 'Gestão de Imóveis' },
  { id: 'operacao', label: 'Agenda & Escala' },
  { id: 'locacao', label: 'Locação & Contratos' },
  { id: 'financeiro', label: 'Financeiro Imobiliária' },
  { id: 'sistema', label: 'Configurações Avançadas' },
];

export default function MasterPlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlano, setEditingPlano] = useState<Partial<Plano> | null>(null);

  useEffect(() => {
    fetchPlanos();
  }, []);

  async function fetchPlanos() {
    try {
      setLoading(true);
      const res = await fetch('/api/master/planos');
      const data = await res.json();
      if (Array.isArray(data)) setPlanos(data);
    } catch (error) {
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!editingPlano?.nome || !editingPlano?.slug) return toast.error('Nome e Slug são obrigatórios');

    try {
      const method = editingPlano.id ? 'PATCH' : 'POST';
      const url = editingPlano.id ? `/api/master/planos/${editingPlano.id}` : '/api/master/planos';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPlano),
      });

      if (res.ok) {
        toast.success('Plano salvo com sucesso');
        setShowModal(false);
        fetchPlanos();
      } else {
        toast.error('Erro ao salvar plano');
      }
    } catch (error) {
      toast.error('Erro na requisição');
    }
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <Link 
        href="/admin/master" 
        className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-all font-black text-[10px] uppercase tracking-widest group"
      >
        <IoArrowBackOutline className="group-hover:-translate-x-1 transition-transform" size={16} />
        Voltar ao Painel Master
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-primary/10 text-primary rounded-xl">
              <IoDiamondOutline size={24} />
            </span>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Gestão de Planos</h1>
          </div>
          <p className="text-slate-500 font-medium">Controle de ofertas, módulos e precificação da plataforma.</p>
        </div>
        <button 
          onClick={() => { setEditingPlano({ modulos: [], ativo: true }); setShowModal(true); }}
          className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-95"
        >
          <IoAddOutline size={20} /> Novo Plano
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Nome / Slug</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Módulos Ativos</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Preço Mensal</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))
              ) : planos.map((plano) => (
                <tr key={plano.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6 border-b border-slate-50">
                    <p className="font-black text-slate-900 tracking-tight">{plano.nome}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{plano.slug}</p>
                  </td>
                  <td className="px-8 py-6 border-b border-slate-50">
                    <div className="flex flex-wrap gap-2 max-w-md">
                      {plano.modulos.map(m => (
                        <span key={m} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          {AVAILABLE_MODULES.find(am => am.id === m)?.label || m}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6 border-b border-slate-50 text-center">
                    <p className="font-black text-slate-900">R$ {plano.preco_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </td>
                  <td className="px-8 py-6 border-b border-slate-50 text-center">
                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${plano.ativo ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                      {plano.ativo ? <IoCheckmarkCircle size={14} /> : <IoCloseCircle size={14} />}
                      {plano.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-8 py-6 border-b border-slate-50 text-right">
                    <button 
                      onClick={() => { setEditingPlano(plano); setShowModal(true); }}
                      className="p-3 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                    >
                      <IoCreateOutline size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Placeholder for creation/edit flow */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-6" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="px-10 py-10 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                  {editingPlano?.id ? 'Editar Plano' : 'Novo Plano Comercial'}
                </h2>
                <p className="text-slate-400 font-medium text-sm mt-1">Defina as permissões e o valor do pacote.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-2xl transition-all">
                <IoCloseCircle size={28} />
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Plano</label>
                  <input 
                    type="text" 
                    value={editingPlano?.nome || ''}
                    onChange={e => setEditingPlano({ ...editingPlano, nome: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    placeholder="Ex: Profissional"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Slug (Link/ID)</label>
                  <input 
                    type="text" 
                    value={editingPlano?.slug || ''}
                    onChange={e => setEditingPlano({ ...editingPlano, slug: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    placeholder="ex: profissional-v1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                <textarea 
                  value={editingPlano?.descricao || ''}
                  onChange={e => setEditingPlano({ ...editingPlano, descricao: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all min-h-[100px]"
                  placeholder="Descreva os benefícios do plano..."
                />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Mensal (R$)</label>
                  <input 
                    type="number" 
                    value={editingPlano?.preco_mensal || 0}
                    onChange={e => setEditingPlano({ ...editingPlano, preco_mensal: parseFloat(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                  />
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-3 cursor-pointer group select-none">
                    <div className={`w-12 h-6 bg-slate-200 rounded-full relative transition-all duration-500 ${editingPlano?.ativo ? '!bg-emerald-500' : ''}`}>
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-500 shadow-sm ${editingPlano?.ativo ? 'left-7' : 'left-1'}`}></div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={editingPlano?.ativo || false} 
                      onChange={(e) => setEditingPlano({ ...editingPlano, ativo: e.target.checked })} 
                      className="hidden" 
                    />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${editingPlano?.ativo ? 'text-emerald-600' : 'text-slate-400'}`}>
                      Plano Ativo
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Módulos do Sistema Habilitados</label>
                <div className="grid grid-cols-2 gap-4">
                  {AVAILABLE_MODULES.map(m => (
                    <label key={m.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${editingPlano?.modulos?.includes(m.id) ? 'border-primary bg-primary/5' : 'border-slate-50 bg-slate-50/50 hover:border-slate-100'}`}>
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded-lg border-2 border-slate-300 text-primary focus:ring-primary"
                        checked={editingPlano?.modulos?.includes(m.id) || false}
                        onChange={(e) => {
                          const current = editingPlano?.modulos || [];
                          const updated = e.target.checked ? [...current, m.id] : current.filter(x => x !== m.id);
                          setEditingPlano({ ...editingPlano, modulos: updated });
                        }}
                      />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button 
                onClick={handleSave}
                className="flex-1 px-10 py-5 rounded-[1.5rem] bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]"
              >
                Salvar Configurações do Plano
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
