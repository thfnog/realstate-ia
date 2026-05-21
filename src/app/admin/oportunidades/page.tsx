'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { IoAddOutline, IoStorefrontOutline, IoPersonOutline, IoCashOutline, IoChatbubbleEllipsesOutline, IoEllipsisVertical } from 'react-icons/io5';
import type { OportunidadeComDetalhes, Corretor, Parceiro, Imovel } from '@/lib/database.types';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

const COLUMNS = [
  { id: 'nova', label: 'Novas', color: 'border-blue-400 bg-blue-50/20 text-blue-800' },
  { id: 'em_negociacao', label: 'Em Negociação', color: 'border-amber-400 bg-amber-50/20 text-amber-800' },
  { id: 'aceita', label: 'Parcerias Ativas', color: 'border-purple-400 bg-purple-50/20 text-purple-800' },
  { id: 'concluida', label: 'Concluídas 🎉', color: 'border-green-400 bg-green-50/20 text-green-800' },
  { id: 'recusada', label: 'Recusadas 🗑️', color: 'border-red-400 bg-red-50/20 text-red-800' }
];

export default function OportunidadesPage() {
  const [oportunidades, setOportunidades] = useState<OportunidadeComDetalhes[]>([]);
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [newOportunidade, setNewOportunidade] = useState({
    titulo: '',
    descricao: '',
    parceiro_id: '',
    corretor_id: '',
    imovel_id: '',
    valor_estimado: '',
    comissao_parceiro: '',
    status: 'nova'
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resOport, resCorr, resParc, resImov] = await Promise.all([
        fetch('/api/oportunidades'),
        fetch('/api/corretores'),
        fetch('/api/parceiros?ativo=true'),
        fetch('/api/imoveis')
      ]);

      if (resOport.ok) {
        const data = await resOport.json();
        setOportunidades(data.data || []);
      }

      if (resCorr.ok) {
        const corretoresData = await resCorr.json();
        setCorretores(Array.isArray(corretoresData) ? corretoresData : []);
      }

      if (resParc.ok) {
        const parceirosData = await resParc.json();
        setParceiros(parceirosData.data || []);
      }

      if (resImov.ok) {
        const imoveisData = await resImov.json();
        setImoveis(imoveisData.data || imoveisData || []);
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      toast.error('Erro ao carregar oportunidades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreateOportunidade(e: React.FormEvent) {
    e.preventDefault();
    if (!newOportunidade.titulo || !newOportunidade.parceiro_id) {
      toast.warning('Título e Parceiro são obrigatórios');
      return;
    }

    try {
      const res = await fetch('/api/oportunidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newOportunidade,
          valor_estimado: newOportunidade.valor_estimado ? parseFloat(newOportunidade.valor_estimado) : null,
          comissao_parceiro: newOportunidade.comissao_parceiro ? parseFloat(newOportunidade.comissao_parceiro) : null,
          corretor_id: newOportunidade.corretor_id || null,
          imovel_id: newOportunidade.imovel_id || null
        })
      });

      if (res.ok) {
        toast.success('Oportunidade de parceria registrada!');
        setShowModal(false);
        setNewOportunidade({
          titulo: '',
          descricao: '',
          parceiro_id: '',
          corretor_id: '',
          imovel_id: '',
          valor_estimado: '',
          comissao_parceiro: '',
          status: 'nova'
        });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erro ao registrar oportunidade');
      }
    } catch {
      toast.error('Erro ao conectar ao servidor');
    }
  }

  async function updateOportunidadeStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/oportunidades/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        setOportunidades(prev => prev.map(o => o.id === id ? { ...o, status } as any : o));
        toast.success('Status da parceria atualizado!');
      } else {
        toast.error('Erro ao atualizar status');
      }
    } catch {
      toast.error('Erro ao atualizar status');
    }
  }

  return (
    <div className="animate-fade-in pb-20 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/50">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
             <span>🤝</span> Oportunidades de Parcerias
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            Pipeline de negócios compartilhados com corretores parceiros externos
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-none"
        >
          <IoAddOutline size={18} />
          Nova Oportunidade
        </button>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {COLUMNS.map((col) => (
            <div key={col.id} className="bg-white rounded-[2rem] border border-slate-100 p-6 space-y-4">
              <LoadingSkeleton className="h-6 w-24" />
              <LoadingSkeleton className="h-28 w-full" />
              <LoadingSkeleton className="h-28 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
          {COLUMNS.map((col) => {
            const list = oportunidades.filter(o => o.status === col.id);
            return (
              <div 
                key={col.id} 
                className="bg-slate-100/40 rounded-[2.5rem] border border-slate-100 p-5 min-h-[600px] flex flex-col space-y-4"
              >
                <div className={`px-4 py-2 border rounded-2xl flex items-center justify-between ${col.color}`}>
                  <span className="text-xs font-black uppercase tracking-widest">{col.label}</span>
                  <span className="text-xs font-black bg-white/60 px-2 py-0.5 rounded-lg">{list.length}</span>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto max-h-[700px] pr-1">
                  {list.length === 0 ? (
                    <div className="text-center py-12 text-slate-300 font-bold uppercase tracking-widest text-[10px]">
                      Nenhuma parceria
                    </div>
                  ) : (
                    list.map((o) => (
                      <div 
                        key={o.id}
                        className="bg-white rounded-3xl border border-slate-100 p-6 hover:shadow-lg hover:border-primary/20 transition-all cursor-grab active:cursor-grabbing relative group shadow-sm"
                      >
                        <h4 className="font-black text-slate-900 text-sm mb-1">{o.titulo}</h4>
                        {o.descricao && (
                          <p className="text-slate-400 text-xs font-medium line-clamp-2 mb-4 leading-relaxed">
                            {o.descricao}
                          </p>
                        )}

                        <div className="space-y-2 border-t border-slate-50 pt-4 text-xs font-bold text-slate-600">
                          {o.parceiro && (
                            <div className="flex items-center gap-1.5">
                              <IoPersonOutline className="text-slate-400 shrink-0" size={14} />
                              <span className="truncate">{o.parceiro.nome}</span>
                              {o.parceiro.imobiliaria_nome && (
                                <span className="text-[10px] text-slate-400 font-medium font-mono truncate">({o.parceiro.imobiliaria_nome})</span>
                              )}
                            </div>
                          )}

                          {o.imovel && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <IoStorefrontOutline className="text-slate-400 shrink-0" size={14} />
                              <span className="truncate">{o.imovel.titulo}</span>
                            </div>
                          )}

                          {o.valor_estimado && (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-black">
                              <IoCashOutline shrink-0 size={14} />
                              <span>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: o.imovel?.moeda || 'BRL' }).format(o.valor_estimado)}
                              </span>
                              {o.comissao_parceiro && (
                                <span className="text-[10px] text-emerald-500 font-medium">({o.comissao_parceiro}% comiss.)</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Status switcher dropdown helper for touch/mobile or easy click */}
                        <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <select 
                            value={o.status}
                            onChange={(e) => updateOportunidadeStatus(o.id, e.target.value)}
                            className="bg-slate-50 text-[10px] uppercase tracking-widest font-black text-slate-500 border border-slate-100 rounded-lg p-1 outline-none cursor-pointer"
                          >
                            <option value="nova">Mover para...</option>
                            {COLUMNS.map(c => c.id !== o.status && (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nova Oportunidade */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden animate-scale-in">
            <div className="px-10 py-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Criar Oportunidade de Parceria</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Negócio em conjunto com corretor parceiro</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 font-black text-lg p-2">✕</button>
            </div>

            <form onSubmit={handleCreateOportunidade} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título do Negócio *</label>
                <input 
                  type="text" 
                  required
                  value={newOportunidade.titulo}
                  onChange={e => setNewOportunidade(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ex: Parceria Casa no Morumbi"
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-100 focus:border-primary/30 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parceiro Externo *</label>
                  <select 
                    required
                    value={newOportunidade.parceiro_id}
                    onChange={e => setNewOportunidade(prev => ({ ...prev, parceiro_id: e.target.value }))}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 focus:border-primary/30 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 transition-all outline-none"
                  >
                    <option value="">Selecione o parceiro...</option>
                    {parceiros.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} {p.imobiliaria_nome ? `(${p.imobiliaria_nome})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultor Interno</label>
                  <select 
                    value={newOportunidade.corretor_id}
                    onChange={e => setNewOportunidade(prev => ({ ...prev, corretor_id: e.target.value }))}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 focus:border-primary/30 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 transition-all outline-none"
                  >
                    <option value="">Nenhum (ou eu)</option>
                    {corretores.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Estimado</label>
                  <input 
                    type="number" 
                    value={newOportunidade.valor_estimado}
                    onChange={e => setNewOportunidade(prev => ({ ...prev, valor_estimado: e.target.value }))}
                    placeholder="Ex: 500000"
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 focus:border-primary/30 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comissão do Parceiro (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={newOportunidade.comissao_parceiro}
                    onChange={e => setNewOportunidade(prev => ({ ...prev, comissao_parceiro: e.target.value }))}
                    placeholder="Ex: 1.5"
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 focus:border-primary/30 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vincular a Imóvel</label>
                <select 
                  value={newOportunidade.imovel_id}
                  onChange={e => setNewOportunidade(prev => ({ ...prev, imovel_id: e.target.value }))}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-100 focus:border-primary/30 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 transition-all outline-none"
                >
                  <option value="">Nenhum imóvel específico</option>
                  {imoveis.map(i => (
                    <option key={i.id} value={i.id}>{i.titulo} - Bairro: {i.freguesia} ({i.moeda} {i.valor.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição da Parceria</label>
                <textarea 
                  value={newOportunidade.descricao}
                  onChange={e => setNewOportunidade(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva as condições da parceria, contatos, ou divisão de lucros"
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
                  Salvar Parceria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
