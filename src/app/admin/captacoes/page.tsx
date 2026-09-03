'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
  IoAddOutline, 
  IoSearchOutline, 
  IoFilterOutline, 
  IoHomeOutline, 
  IoPersonOutline, 
  IoCallOutline, 
  IoLogoWhatsapp, 
  IoCameraOutline, 
  IoCheckmarkCircleOutline, 
  IoArrowForwardOutline, 
  IoEyeOutline, 
  IoTrashOutline,
  IoSparklesOutline,
  IoLocationOutline,
  IoBedOutline,
  IoCarOutline,
  IoResizeOutline,
  IoCloseOutline,
  IoDocumentTextOutline
} from 'react-icons/io5';
import type { CaptacaoComDetalhes, Corretor, StatusCaptacao, TipoImovel } from '@/lib/database.types';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

const COLUMNS: { id: StatusCaptacao; label: string; badge: string; border: string; bg: string; icon: string }[] = [
  { id: 'prospeccao', label: 'Prospecção', badge: 'bg-blue-100 text-blue-700', border: 'border-blue-300', bg: 'bg-blue-50/20', icon: '🔍' },
  { id: 'avaliacao_realizada', label: 'Avaliação Realizada', badge: 'bg-amber-100 text-amber-700', border: 'border-amber-300', bg: 'bg-amber-50/20', icon: '📐' },
  { id: 'autorizacao_assinada', label: 'Autorização Assinada', badge: 'bg-purple-100 text-purple-700', border: 'border-purple-300', bg: 'bg-purple-50/20', icon: '✍️' },
  { id: 'fotos_agendadas', label: 'Fotos Agendadas', badge: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-300', bg: 'bg-indigo-50/20', icon: '📸' },
  { id: 'publicado', label: 'Publicado no Catálogo', badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-300', bg: 'bg-emerald-50/20', icon: '🚀' },
];

const TIPOS_IMOVEL: { label: string; value: TipoImovel }[] = [
  { label: 'Apartamento', value: 'apartamento' },
  { label: 'Casa', value: 'casa' },
  { label: 'Casa de Condomínio', value: 'casa_condominio' },
  { label: 'Cobertura', value: 'cobertura' },
  { label: 'Terreno / Lote', value: 'terreno' },
  { label: 'Sala Comercial', value: 'sala_comercial' },
  { label: 'Galpão', value: 'galpao' },
  { label: 'Chácara / Sítio', value: 'chacara' }
];

export default function CaptacoesPage() {
  const [captacoes, setCaptacoes] = useState<CaptacaoComDetalhes[]>([]);
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCorretor, setFilterCorretor] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  // Modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCaptacao, setSelectedCaptacao] = useState<CaptacaoComDetalhes | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'apartamento' as TipoImovel,
    finalidade: 'venda',
    status: 'prospeccao' as StatusCaptacao,
    origem: 'manual',
    corretor_id: '',
    proprietario_nome: '',
    proprietario_telefone: '',
    proprietario_email: '',
    distrito: 'SP',
    concelho: 'São Paulo',
    freguesia: '',
    rua: '',
    numero: '',
    complemento: '',
    codigo_postal: '',
    area_util: '',
    area_total: '',
    quartos: '',
    suites: '',
    banheiros: '',
    vagas: '',
    valor_estimado: '',
    valor_locacao_estimado: '',
    condominio_estimado: '',
    iptu_estimado: '',
    descricao: '',
    observacoes: ''
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resCapt, resCorr] = await Promise.all([
        fetch('/api/captacoes'),
        fetch('/api/corretores')
      ]);

      if (resCapt.ok) {
        const data = await resCapt.json();
        setCaptacoes(data.data || []);
      }

      if (resCorr.ok) {
        const corretoresData = await resCorr.json();
        setCorretores(Array.isArray(corretoresData) ? corretoresData : []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      toast.error('Erro ao carregar captações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtragem
  const filteredCaptacoes = useMemo(() => {
    return captacoes.filter(c => {
      if (filterCorretor && c.corretor_id !== filterCorretor) return false;
      if (filterTipo && c.tipo !== filterTipo) return false;
      if (search) {
        const s = search.toLowerCase();
        const matchesTitulo = c.titulo?.toLowerCase().includes(s);
        const matchesProp = c.proprietario_nome?.toLowerCase().includes(s);
        const matchesTel = c.proprietario_telefone?.includes(s);
        const matchesBairro = c.freguesia?.toLowerCase().includes(s);
        const matchesCidade = c.concelho?.toLowerCase().includes(s);
        if (!matchesTitulo && !matchesProp && !matchesTel && !matchesBairro && !matchesCidade) return false;
      }
      return true;
    });
  }, [captacoes, filterCorretor, filterTipo, search]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = captacoes.length;
    const avaliacao = captacoes.filter(c => c.status === 'avaliacao_realizada').length;
    const autorizadasOuFotos = captacoes.filter(c => c.status === 'autorizacao_assinada' || c.status === 'fotos_agendadas').length;
    const publicadas = captacoes.filter(c => c.status === 'publicado').length;
    const valorTotal = captacoes.reduce((acc, c) => acc + (c.valor_estimado || 0), 0);

    return { total, avaliacao, autorizadasOuFotos, publicadas, valorTotal };
  }, [captacoes]);

  // Criar Captação Manual
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.titulo) {
      toast.warning('Título é obrigatório');
      return;
    }

    try {
      const res = await fetch('/api/captacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success('Captação registrada com sucesso!');
        setShowCreateModal(false);
        setFormData({
          titulo: '',
          tipo: 'apartamento',
          finalidade: 'venda',
          status: 'prospeccao',
          origem: 'manual',
          corretor_id: '',
          proprietario_nome: '',
          proprietario_telefone: '',
          proprietario_email: '',
          distrito: 'SP',
          concelho: 'São Paulo',
          freguesia: '',
          rua: '',
          numero: '',
          complemento: '',
          codigo_postal: '',
          area_util: '',
          area_total: '',
          quartos: '',
          suites: '',
          banheiros: '',
          vagas: '',
          valor_estimado: '',
          valor_locacao_estimado: '',
          condominio_estimado: '',
          iptu_estimado: '',
          descricao: '',
          observacoes: ''
        });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erro ao registrar captação');
      }
    } catch {
      toast.error('Erro de conexão ao salvar captação');
    }
  }

  // Atualizar Status / Mover de Coluna
  async function handleUpdateStatus(id: string, newStatus: StatusCaptacao) {
    try {
      const res = await fetch(`/api/captacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setCaptacoes(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
        if (selectedCaptacao && selectedCaptacao.id === id) {
          setSelectedCaptacao(prev => prev ? { ...prev, status: newStatus } : null);
        }
        toast.success('Status da captação atualizado!');
      } else {
        toast.error('Erro ao atualizar status');
      }
    } catch {
      toast.error('Erro ao conectar ao servidor');
    }
  }

  // Publicar no Catálogo
  async function handlePublicar(id: string) {
    try {
      setPublishingId(id);
      const res = await fetch(`/api/captacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publicar', status: 'publicado' })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('🎉 Imóvel publicado no catálogo e integrado aos feeds!');
        if (selectedCaptacao && selectedCaptacao.id === id) {
          setSelectedCaptacao(prev => prev ? { ...prev, status: 'publicado', imovel_id: data.imovel?.id } : null);
        }
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Falha ao publicar imóvel');
      }
    } catch {
      toast.error('Erro ao conectar ao servidor');
    } finally {
      setPublishingId(null);
    }
  }

  // Excluir Captação
  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente remover esta captação?')) return;
    try {
      const res = await fetch(`/api/captacoes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCaptacoes(prev => prev.filter(c => c.id !== id));
        if (selectedCaptacao && selectedCaptacao.id === id) setSelectedCaptacao(null);
        toast.success('Captação removida');
      } else {
        toast.error('Erro ao remover');
      }
    } catch {
      toast.error('Erro de conexão');
    }
  }

  return (
    <div className="animate-fade-in pb-20 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏗️</span>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-widest">
              Funil de Captações de Imóveis
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            Pipeline de captação, avaliação e publicação com extração automática via WhatsApp
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/api/public/xml/portais"
            target="_blank"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-700 uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm"
          >
            <span>📡</span> Feed XML Portais
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <IoAddOutline className="w-5 h-5" />
            Nova Captação Manual
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total no Funil</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Em Avaliação</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats.avaliacao}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Contratos / Fotos</p>
          <p className="text-2xl font-black text-purple-600 mt-1">{stats.autorizadasOuFotos}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Publicados no Catálogo</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.publicadas}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm col-span-2 md:col-span-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Estimado</p>
          <p className="text-xl font-black text-slate-900 mt-1 truncate">
            {stats.valorTotal > 0 ? `R$ ${(stats.valorTotal / 1000000).toFixed(1)}M` : 'R$ 0'}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por título, proprietário, bairro..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={filterCorretor}
            onChange={e => setFilterCorretor(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todos os Corretores</option>
            {corretores.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          <select
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todos os Tipos</option>
            {TIPOS_IMOVEL.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {(search || filterCorretor || filterTipo) && (
            <button
              onClick={() => { setSearch(''); setFilterCorretor(''); setFilterTipo(''); }}
              className="text-xs font-bold text-rose-500 hover:text-rose-600 px-2 py-1"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-6">
          {COLUMNS.map(column => {
            const columnItems = filteredCaptacoes.filter(c => c.status === column.id);

            return (
              <div
                key={column.id}
                className={`flex flex-col rounded-3xl border ${column.border} ${column.bg} p-4 min-h-[500px]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{column.icon}</span>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                      {column.label}
                    </h3>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${column.badge}`}>
                    {columnItems.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[700px] pr-1">
                  {columnItems.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-center p-4 border border-dashed border-slate-300/60 rounded-2xl">
                      <p className="text-[11px] font-bold">Nenhuma captação nesta etapa</p>
                    </div>
                  ) : (
                    columnItems.map(item => {
                      const nextColumnIndex = COLUMNS.findIndex(c => c.id === item.status) + 1;
                      const nextColumn = nextColumnIndex < COLUMNS.length ? COLUMNS[nextColumnIndex] : null;

                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-3 group"
                        >
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {item.tipo.replace('_', ' ')}
                            </span>

                            {item.origem === 'whatsapp' ? (
                              <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/50">
                                <IoLogoWhatsapp className="w-3 h-3" /> WhatsApp IA
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-50 text-slate-500">
                                Manual
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h4 
                            onClick={() => setSelectedCaptacao(item)}
                            className="text-xs font-black text-slate-900 line-clamp-2 cursor-pointer hover:text-primary transition-colors leading-tight"
                          >
                            {item.titulo}
                          </h4>

                          {/* Location & Specs */}
                          <div className="text-[11px] text-slate-500 space-y-1">
                            {item.freguesia && (
                              <p className="flex items-center gap-1 font-medium truncate">
                                <IoLocationOutline className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                {item.freguesia}{item.concelho ? `, ${item.concelho}` : ''}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold pt-1">
                              {item.area_util ? (
                                <span className="flex items-center gap-0.5">
                                  <IoResizeOutline className="w-3 h-3" /> {item.area_util}m²
                                </span>
                              ) : null}
                              {item.quartos ? (
                                <span className="flex items-center gap-0.5">
                                  <IoBedOutline className="w-3 h-3" /> {item.quartos} qtos
                                </span>
                              ) : null}
                              {item.vagas ? (
                                <span className="flex items-center gap-0.5">
                                  <IoCarOutline className="w-3 h-3" /> {item.vagas} vag
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Price & Owner */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Estimado</p>
                              <p className="text-xs font-black text-emerald-600">
                                {item.valor_estimado ? `R$ ${item.valor_estimado.toLocaleString('pt-BR')}` : (item.valor_locacao_estimado ? `R$ ${item.valor_locacao_estimado.toLocaleString('pt-BR')}/mês` : 'Sob Consulta')}
                              </p>
                            </div>

                            {item.proprietario_telefone && (
                              <a
                                href={`https://wa.me/55${item.proprietario_telefone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                title={`WhatsApp: ${item.proprietario_nome || 'Proprietário'}`}
                              >
                                <IoLogoWhatsapp className="w-4 h-4" />
                              </a>
                            )}
                          </div>

                          {/* Broker & Actions */}
                          <div className="pt-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-600 truncate">
                              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[9px] shrink-0">
                                {item.corretor?.nome?.charAt(0) || 'C'}
                              </div>
                              <span className="truncate">{item.corretor?.nome || 'Não atribuído'}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setSelectedCaptacao(item)}
                                className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors"
                                title="Ver Detalhes"
                              >
                                <IoEyeOutline className="w-4 h-4" />
                              </button>

                              {nextColumn && (
                                <button
                                  onClick={() => handleUpdateStatus(item.id, nextColumn.id)}
                                  className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                  title={`Avançar para: ${nextColumn.label}`}
                                >
                                  <IoArrowForwardOutline className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nova Captação */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <span>🏗️</span> Nova Captação de Imóvel
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  Cadastre um imóvel diretamente no funil de captação
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all"
              >
                <IoCloseOutline className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">
                  1. Dados Básicos do Imóvel
                </h3>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Título Comercial *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Apartamento Alto Padrão no Jardins com 3 Suítes"
                    value={formData.titulo}
                    onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Tipo de Imóvel
                    </label>
                    <select
                      value={formData.tipo}
                      onChange={e => setFormData({ ...formData, tipo: e.target.value as TipoImovel })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      {TIPOS_IMOVEL.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Finalidade
                    </label>
                    <select
                      value={formData.finalidade}
                      onChange={e => setFormData({ ...formData, finalidade: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="venda">Venda</option>
                      <option value="aluguel">Aluguel</option>
                      <option value="ambos">Venda e Aluguel</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Etapa Inicial
                    </label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as StatusCaptacao })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      {COLUMNS.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Valores e Dimensões */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">
                  2. Valores & Características
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Valor Venda (R$)
                    </label>
                    <input
                      type="number"
                      placeholder="850000"
                      value={formData.valor_estimado}
                      onChange={e => setFormData({ ...formData, valor_estimado: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Aluguel (R$/mês)
                    </label>
                    <input
                      type="number"
                      placeholder="3500"
                      value={formData.valor_locacao_estimado}
                      onChange={e => setFormData({ ...formData, valor_locacao_estimado: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Condomínio (R$)
                    </label>
                    <input
                      type="number"
                      placeholder="800"
                      value={formData.condominio_estimado}
                      onChange={e => setFormData({ ...formData, condominio_estimado: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      IPTU Anual (R$)
                    </label>
                    <input
                      type="number"
                      placeholder="1200"
                      value={formData.iptu_estimado}
                      onChange={e => setFormData({ ...formData, iptu_estimado: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Área Útil (m²)
                    </label>
                    <input
                      type="number"
                      placeholder="120"
                      value={formData.area_util}
                      onChange={e => setFormData({ ...formData, area_util: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Quartos
                    </label>
                    <input
                      type="number"
                      placeholder="3"
                      value={formData.quartos}
                      onChange={e => setFormData({ ...formData, quartos: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Suítes
                    </label>
                    <input
                      type="number"
                      placeholder="1"
                      value={formData.suites}
                      onChange={e => setFormData({ ...formData, suites: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Banheiros
                    </label>
                    <input
                      type="number"
                      placeholder="2"
                      value={formData.banheiros}
                      onChange={e => setFormData({ ...formData, banheiros: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Vagas Garagem
                    </label>
                    <input
                      type="number"
                      placeholder="2"
                      value={formData.vagas}
                      onChange={e => setFormData({ ...formData, vagas: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Localização */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">
                  3. Localização
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      placeholder="Jardins"
                      value={formData.freguesia}
                      onChange={e => setFormData({ ...formData, freguesia: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      placeholder="São Paulo"
                      value={formData.concelho}
                      onChange={e => setFormData({ ...formData, concelho: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Estado
                    </label>
                    <input
                      type="text"
                      placeholder="SP"
                      value={formData.distrito}
                      onChange={e => setFormData({ ...formData, distrito: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Proprietário e Corretor */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">
                  4. Proprietário & Responsável
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Nome do Proprietário
                    </label>
                    <input
                      type="text"
                      placeholder="Carlos Silveira"
                      value={formData.proprietario_nome}
                      onChange={e => setFormData({ ...formData, proprietario_nome: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Telefone do Proprietário
                    </label>
                    <input
                      type="text"
                      placeholder="(11) 99888-7766"
                      value={formData.proprietario_telefone}
                      onChange={e => setFormData({ ...formData, proprietario_telefone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Corretor Responsável
                    </label>
                    <select
                      value={formData.corretor_id}
                      onChange={e => setFormData({ ...formData, corretor_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="">Selecione o corretor...</option>
                      {corretores.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Descrição Comercial / Anotações
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Destaques, diferenciais, negociação e mobília..."
                    value={formData.descricao}
                    onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 shadow-md shadow-primary/20"
                >
                  Salvar Captação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ficha Completa da Captação */}
      {selectedCaptacao && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                    {selectedCaptacao.tipo.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {selectedCaptacao.finalidade}
                  </span>
                  {selectedCaptacao.origem === 'whatsapp' && (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600">
                      <IoLogoWhatsapp className="w-3.5 h-3.5" /> WhatsApp IA
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-slate-900 mt-2">
                  {selectedCaptacao.titulo}
                </h2>
              </div>
              <button
                onClick={() => setSelectedCaptacao(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all"
              >
                <IoCloseOutline className="w-6 h-6" />
              </button>
            </div>

            {/* Stage Selector */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Estágio do Funil
              </label>
              <div className="flex flex-wrap gap-2">
                {COLUMNS.map(col => {
                  const isCurrent = selectedCaptacao.status === col.id;
                  return (
                    <button
                      key={col.id}
                      onClick={() => handleUpdateStatus(selectedCaptacao.id, col.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isCurrent 
                          ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{col.icon}</span> {col.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid Specs & Financial */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valores</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valor Estimado (Venda):</span>
                    <span className="font-bold text-slate-900">
                      {selectedCaptacao.valor_estimado ? `R$ ${selectedCaptacao.valor_estimado.toLocaleString('pt-BR')}` : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valor Estimado (Locação):</span>
                    <span className="font-bold text-slate-900">
                      {selectedCaptacao.valor_locacao_estimado ? `R$ ${selectedCaptacao.valor_locacao_estimado.toLocaleString('pt-BR')}/mês` : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Condomínio Mensal:</span>
                    <span className="font-bold text-slate-900">
                      {selectedCaptacao.condominio_estimado ? `R$ ${selectedCaptacao.condominio_estimado.toLocaleString('pt-BR')}` : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">IPTU Anual:</span>
                    <span className="font-bold text-slate-900">
                      {selectedCaptacao.iptu_estimado ? `R$ ${selectedCaptacao.iptu_estimado.toLocaleString('pt-BR')}` : '--'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Características & Cômodos</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Área Útil / Total:</span>
                    <span className="font-bold text-slate-900">
                      {selectedCaptacao.area_util || '--'} m² / {selectedCaptacao.area_total || '--'} m²
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quartos (Suítes):</span>
                    <span className="font-bold text-slate-900">
                      {selectedCaptacao.quartos || 0} ({selectedCaptacao.suites || 0} suítes)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Banheiros:</span>
                    <span className="font-bold text-slate-900">{selectedCaptacao.banheiros || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vagas de Garagem:</span>
                    <span className="font-bold text-slate-900">{selectedCaptacao.vagas || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Proprietário & Contato */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-3">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contato do Proprietário</h4>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {selectedCaptacao.proprietario_nome || 'Nome não informado'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedCaptacao.proprietario_telefone || 'Sem telefone'} • {selectedCaptacao.proprietario_email || 'Sem e-mail'}
                  </p>
                </div>
                {selectedCaptacao.proprietario_telefone && (
                  <a
                    href={`https://wa.me/55${selectedCaptacao.proprietario_telefone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
                  >
                    <IoLogoWhatsapp className="w-4 h-4" /> Conversar no WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* Description */}
            {selectedCaptacao.descricao && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição Comercial</h4>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {selectedCaptacao.descricao}
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => handleDelete(selectedCaptacao.id)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-black uppercase tracking-widest transition-colors"
              >
                <IoTrashOutline className="w-4 h-4" /> Descartar Captação
              </button>

              <div className="flex items-center gap-3">
                {selectedCaptacao.imovel_id ? (
                  <Link
                    href={`/admin/imoveis/${selectedCaptacao.imovel_id}`}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
                  >
                    <IoHomeOutline className="w-4 h-4" /> Ver Imóvel no Catálogo
                  </Link>
                ) : (
                  <button
                    onClick={() => handlePublicar(selectedCaptacao.id)}
                    disabled={publishingId === selectedCaptacao.id}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                  >
                    <IoCheckmarkCircleOutline className="w-4 h-4" />
                    {publishingId === selectedCaptacao.id ? 'Publicando...' : 'Publicar no Catálogo de Imóveis'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
