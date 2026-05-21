'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { IoAddOutline, IoSearchOutline, IoStorefrontOutline, IoPersonOutline, IoCallOutline, IoMailOutline, IoCardOutline, IoBookOutline } from 'react-icons/io5';
import type { Parceiro } from '@/lib/database.types';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

export default function ParceirosPage() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ativoFilter, setAtivoFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 50;

  // New partner state
  const [newParceiro, setNewParceiro] = useState({
    nome: '',
    telefone: '',
    email: '',
    creci: '',
    imobiliaria_nome: '',
    notas: '',
    ativo: true
  });

  const fetchParceiros = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL('/api/parceiros', window.location.origin);
      if (searchQuery) url.searchParams.set('search', searchQuery);
      if (ativoFilter !== 'all') url.searchParams.set('ativo', ativoFilter);
      url.searchParams.set('page', page.toString());
      url.searchParams.set('limit', limit.toString());

      const res = await fetch(url.toString());
      if (res.ok) {
        const result = await res.json();
        setParceiros(result.data || []);
        setTotalCount(result.count || 0);
      }
    } catch (err) {
      console.error('Erro ao buscar parceiros:', err);
      toast.error('Erro ao carregar parceiros');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, ativoFilter, page]);

  useEffect(() => {
    fetchParceiros();
  }, [fetchParceiros]);

  async function handleCreateParceiro(e: React.FormEvent) {
    e.preventDefault();
    if (!newParceiro.nome || !newParceiro.telefone) {
      toast.warning('Nome e telefone são obrigatórios');
      return;
    }

    try {
      const res = await fetch('/api/parceiros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newParceiro)
      });

      if (res.ok) {
        toast.success('Parceiro cadastrado com sucesso!');
        setShowModal(false);
        setNewParceiro({
          nome: '',
          telefone: '',
          email: '',
          creci: '',
          imobiliaria_nome: '',
          notas: '',
          ativo: true
        });
        fetchParceiros();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erro ao cadastrar parceiro');
      }
    } catch {
      toast.error('Erro ao conectar ao servidor');
    }
  }

  async function toggleAtivo(parceiro: Parceiro) {
    try {
      const res = await fetch(`/api/parceiros/${parceiro.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !parceiro.ativo })
      });

      if (res.ok) {
        setParceiros(prev => prev.map(p => p.id === parceiro.id ? { ...p, ativo: !p.ativo } : p));
        toast.success(`Parceiro ${parceiro.nome} ${!parceiro.ativo ? 'ativado' : 'desativado'}`);
      }
    } catch {
      toast.error('Erro ao atualizar status do parceiro');
    }
  }

  return (
    <div className="animate-fade-in pb-20 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/50">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
             <span>🏪</span> Parceiros de Negócios
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            Gestão de corretores externos e imobiliárias parceiras ({totalCount})
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-none"
        >
          <IoAddOutline size={18} />
          Novo Parceiro
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[2rem] border border-slate-100 p-6 flex flex-col md:flex-row gap-4 items-center shadow-md shadow-slate-100/50">
        <div className="relative flex-1 w-full">
          <IoSearchOutline size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Pesquisar por nome, imobiliária ou telefone..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-12 pr-6 py-3.5 bg-slate-50/50 border border-slate-100 focus:border-primary/30 rounded-2xl text-sm font-bold text-slate-700 placeholder-slate-400 transition-all"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto shrink-0">
          <select 
            value={ativoFilter} 
            onChange={(e) => {
              setAtivoFilter(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-48 px-5 py-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 uppercase tracking-widest transition-all"
          >
            <option value="all">Todos os Status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/50 space-y-4">
          <LoadingSkeleton className="h-10 w-full" />
          <LoadingSkeleton className="h-16 w-full" />
          <LoadingSkeleton className="h-16 w-full" />
          <LoadingSkeleton className="h-16 w-full" />
        </div>
      ) : parceiros.length === 0 ? (
        <div className="bg-white rounded-[3rem] border border-dashed border-slate-200 p-24 text-center">
          <p className="text-7xl mb-6 opacity-20">🏪</p>
          <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Nenhum parceiro encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Imobiliária</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">CRECI</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Negócios</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold text-slate-700 text-sm">
                {parceiros.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                          {p.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{p.nome}</p>
                          <p className="text-slate-400 text-xs font-medium truncate max-w-[200px] mt-0.5">{p.notas || 'Sem observações'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-slate-600">
                      {p.imobiliaria_nome ? (
                        <span className="flex items-center gap-1">
                          <IoStorefrontOutline size={16} className="text-slate-400" />
                          {p.imobiliaria_nome}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">Autônomo</span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="space-y-0.5">
                        <p className="flex items-center gap-1.5 text-slate-900">
                          <IoCallOutline size={14} className="text-slate-400" />
                          {p.telefone}
                        </p>
                        {p.email && (
                          <p className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                            <IoMailOutline size={14} className="text-slate-400" />
                            {p.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-slate-600 font-black">
                      {p.creci ? (
                        <span className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl text-xs">
                          {p.creci}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">Não informado</span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-center font-black text-slate-900">
                      {p.total_negocios || 0}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => toggleAtivo(p)}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${
                          p.ativo 
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {Math.ceil(totalCount / limit) > 1 && (
        <div className="flex items-center justify-between px-10 py-6 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Exibindo <span className="text-slate-900">{(page - 1) * limit + 1}</span> — <span className="text-slate-900">{Math.min(page * limit, totalCount)}</span> de <span className="text-slate-900">{totalCount}</span> parceiros
          </p>
          <div className="flex items-center gap-4">
            <button 
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Anterior
            </button>
            <span className="text-[10px] font-black text-primary px-2 uppercase tracking-widest">
              Página {page} / {Math.ceil(totalCount / limit)}
            </span>
            <button 
              disabled={page >= Math.ceil(totalCount / limit)}
              onClick={() => setPage(page + 1)}
              className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 bg-white text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden animate-scale-in">
            <div className="px-10 py-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Cadastrar Parceiro</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Insira os dados do corretor parceiro</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-900 font-black text-lg p-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateParceiro} className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <IoPersonOutline size={12} /> Nome *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={newParceiro.nome}
                    onChange={e => setNewParceiro(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: João Silva"
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 focus:border-primary/30 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <IoCallOutline size={12} /> Telefone *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={newParceiro.telefone}
                    onChange={e => setNewParceiro(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="Ex: +5511999999999"
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 focus:border-primary/30 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <IoMailOutline size={12} /> Email
                  </label>
                  <input 
                    type="email" 
                    value={newParceiro.email}
                    onChange={e => setNewParceiro(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Ex: joao@parceiro.com"
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 focus:border-primary/30 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <IoCardOutline size={12} /> CRECI
                  </label>
                  <input 
                    type="text" 
                    value={newParceiro.creci}
                    onChange={e => setNewParceiro(prev => ({ ...prev, creci: e.target.value }))}
                    placeholder="Ex: 12345-F"
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 focus:border-primary/30 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <IoStorefrontOutline size={12} /> Nome da Imobiliária Parceira
                </label>
                <input 
                  type="text" 
                  value={newParceiro.imobiliaria_nome}
                  onChange={e => setNewParceiro(prev => ({ ...prev, imobiliaria_nome: e.target.value }))}
                  placeholder="Ex: Imobiliária Elite"
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-100 focus:border-primary/30 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 transition-all outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <IoBookOutline size={12} /> Observações / Notas
                </label>
                <textarea 
                  value={newParceiro.notas}
                  onChange={e => setNewParceiro(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Notas adicionais sobre a parceria ou contatos"
                  rows={3}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 focus:border-primary/30 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 transition-all outline-none resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-end gap-4 bg-slate-50/20 -mx-10 -mb-10 px-10 py-6">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-100 bg-white text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-white hover:bg-slate-900 transition-all shadow-lg shadow-primary/20 hover:shadow-none"
                >
                  Salvar Parceiro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
