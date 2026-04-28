'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IoAddOutline, IoSearchOutline, IoTrashOutline, IoExpandOutline, IoBedOutline, IoFilterOutline, IoChevronBackOutline, IoChevronForwardOutline, IoPricetagOutline } from 'react-icons/io5';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PlanGuard } from '@/components/PlanGuard';
import { getConfigByCode, formatCurrency, CountryConfig } from '@/lib/countryConfig';

interface Imovel {
  id: string;
  titulo: string;
  valor: number;
  quartos: number;
  area_util: number;
  area_bruta: number;
  status: string;
  tipo: string;
  fotos: string[];
  concelho: string;
}

export default function ImoveisPage() {
  const router = useRouter();
  const [config, setConfig] = useState<CountryConfig>(getConfigByCode('PT'));
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ 
    status: '', 
    tipo: '', 
    min_valor: '', 
    max_valor: '', 
    min_area: '', 
    max_area: '' 
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const LIMIT = 12;

  async function fetchConfig() {
    try {
      const res = await fetch('/api/imobiliaria');
      const data = await res.json();
      if (data && data.config_pais) {
        setConfig(getConfigByCode(data.config_pais));
      }
    } catch (err) {
      console.error('Erro ao buscar config:', err);
    }
  }

  async function fetchImoveis() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: LIMIT.toString(),
        status: filter.status,
        tipo: filter.tipo,
        min_valor: filter.min_valor,
        max_valor: filter.max_valor,
        min_area: filter.min_area,
        max_area: filter.max_area,
        search: searchTerm
      });

      const res = await fetch(`/api/imoveis?${params.toString()}`);
      const result = await res.json();
      
      if (result && Array.isArray(result.data)) {
        setImoveis(result.data);
        setTotalCount(result.count || 0);
        setTotalPages(Math.ceil((result.count || 0) / LIMIT));
      }
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Erro ao buscar stats:', err);
    }
  }

  useEffect(() => { 
    fetchConfig();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchImoveis();
  }, [page, filter, searchTerm]);

  const proxyImage = (url: string) => {
    if (!url) return '';
    if (url.includes('rodrigomartinatti.com.br')) {
      return `/api/proxy/image?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  async function handleDelete(id: string) {
    if (!confirm('Excluir este imóvel?')) return;
    await fetch(`/api/imoveis/${id}`, { method: 'DELETE' });
    fetchImoveis();
  }

  const statusBadge: Record<string, string> = {
    disponivel: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    reservado: 'bg-amber-50 text-amber-600 border-amber-100',
    vendido: 'bg-rose-50 text-rose-600 border-rose-100',
    arrendado: 'bg-sky-50 text-sky-600 border-sky-100',
    retirado: 'bg-slate-50 text-slate-500 border-slate-200',
  };

  return (
    <PlanGuard requiredModule="inventario">
      <div className="space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Gestão de Imóveis</h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie sua carteira de ativos imobiliários profissional.</p>
        </div>
        <Link
          href="/admin/imoveis/novo"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-slate-900 text-white font-black shadow-xl shadow-slate-900/10 hover:bg-primary hover:shadow-primary/30 transition-all hover:scale-105 active:scale-95 text-xs uppercase tracking-widest"
        >
          <IoAddOutline size={20} /> Captar novo imóvel
        </Link>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Carteira</p>
             <p className="text-3xl font-black text-slate-900 tracking-tighter">{stats?.totalImoveis || totalCount}</p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Disponíveis</p>
             <p className="text-3xl font-black text-emerald-600 tracking-tighter">{stats?.imoveisDisponiveis || (stats ? 0 : totalCount)}</p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Negociação</p>
             <p className="text-3xl font-black text-amber-500 tracking-tighter">{stats?.imoveisReservados || 0}</p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fechados</p>
             <p className="text-3xl font-black text-primary tracking-tighter">{stats?.imoveisFechados || 0}</p>
          </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-10 rounded-[3rem] space-y-8 border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex-1 min-w-[320px] relative">
              <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
              <input 
                  type="text"
                  placeholder="Referência, título ou cidade..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status:</span>
              <select 
                  value={filter.status} 
                  onChange={e => setFilter({...filter, status: e.target.value})}
                  className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer"
              >
                  <option value="">Todos</option>
                  <option value="disponivel">Disponíveis</option>
                  <option value="reservado">Reservados</option>
                  <option value="vendido">Vendidos</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo:</span>
              <select 
                  value={filter.tipo} 
                  onChange={e => setFilter({...filter, tipo: e.target.value})}
                  className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer"
              >
                  <option value="">Todos</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="casa">Casa</option>
                  <option value="terreno">Terreno</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-10 pt-8 border-t border-slate-50">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço:</span>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  placeholder="Min" 
                  value={filter.min_valor}
                  onChange={e => setFilter({...filter, min_valor: e.target.value})}
                  className="w-32 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                />
                <span className="text-slate-300 text-xs">—</span>
                <input 
                  type="number" 
                  placeholder="Max" 
                  value={filter.max_valor}
                  onChange={e => setFilter({...filter, max_valor: e.target.value})}
                  className="w-32 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Área (m²):</span>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  placeholder="Min" 
                  value={filter.min_area}
                  onChange={e => setFilter({...filter, min_area: e.target.value})}
                  className="w-28 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                />
                <span className="text-slate-300 text-xs">—</span>
                <input 
                  type="number" 
                  placeholder="Max" 
                  value={filter.max_area}
                  onChange={e => setFilter({...filter, max_area: e.target.value})}
                  className="w-28 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <button 
              onClick={() => {
                setFilter({ status: '', tipo: '', min_valor: '', max_valor: '', min_area: '', max_area: '' });
                setSearchTerm('');
              }}
              className="text-[10px] font-black text-primary hover:underline ml-auto uppercase tracking-widest"
            >
              Limpar Filtros
            </button>
          </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-[2.5rem] border border-slate-100 h-96 animate-pulse shadow-xl shadow-slate-200/50" />
          ))}
        </div>
      ) : imoveis.length === 0 ? (
        <div className="bg-white rounded-[3rem] border border-dashed border-slate-200 p-32 text-center">
          <p className="text-8xl mb-8 opacity-20">🏠</p>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nenhum imóvel encontrado</h2>
          <p className="text-slate-500 mt-2 mb-10 font-medium">Tente ajustar seus filtros para encontrar o que procura profissionalmente.</p>
          <button 
            onClick={() => {
              setFilter({ status: '', tipo: '', min_valor: '', max_valor: '', min_area: '', max_area: '' });
              setSearchTerm('');
            }}
            className="px-10 py-4 rounded-2xl bg-primary/10 text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
          >
            Limpar todos os filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {imoveis.map((im) => (
            <div 
              key={im.id} 
              onClick={() => router.push(`/admin/imoveis/${im.id}`)}
              className="group bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col h-full"
            >
              {/* Image Preview */}
              <div className="relative h-64 bg-slate-50 overflow-hidden shrink-0">
                {im.fotos && (im.fotos as any[]).length > 0 ? (
                  <img 
                    src={proxyImage((im.fotos as any[]).find(f => f.is_capa)?.url_media || (im.fotos as any[])[0].url_media || (im.fotos as any[])[0])} 
                    alt={im.titulo} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
                    <span className="text-6xl">📸</span>
                    <span className="text-[10px] font-black uppercase tracking-widest mt-4">Sem Fotos</span>
                  </div>
                )}
                
                <div className="absolute top-6 left-6">
                   <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-lg backdrop-blur-md ${statusBadge[im.status]}`}>
                      {im.status}
                   </span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-8 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                        <IoPricetagOutline /> {im.tipo} • {im.concelho}
                      </p>
                      <h3 className="text-xl font-black text-slate-900 line-clamp-1 group-hover:text-primary transition-colors tracking-tight">{im.titulo || 'Imóvel sem título'}</h3>
                   </div>
                </div>

                <div className="flex gap-6 mt-4 py-5 border-y border-slate-50">
                    <div className="flex items-center gap-2">
                       <IoBedOutline className="text-slate-400" />
                       <span className="text-xs font-black text-slate-700">{im.quartos || '—'} {config.terminology.quartosLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <IoExpandOutline className="text-slate-400" />
                       <span className="text-xs font-black text-slate-700">{im.area_util || im.area_bruta || '—'} m²</span>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-8 gap-4">
                   <span className="text-2xl font-black text-slate-900 tracking-tighter truncate" title={formatCurrency(im.valor, config)}>
                      {formatCurrency(im.valor, config)}
                   </span>
                   
                   <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(im.id); }}
                        className="p-3 rounded-2xl bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-all border border-slate-100"
                        title="Excluir"
                      >
                         <IoTrashOutline size={18} />
                      </button>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-12 pb-12">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-900 hover:border-primary disabled:opacity-30 transition-all shadow-sm"
          >
            ←
          </button>
          
          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, i, arr) => (
                <div key={p} className="flex items-center">
                  {i > 0 && arr[i-1] !== p - 1 && <span className="px-3 text-slate-300 font-black">...</span>}
                  <button
                    onClick={() => setPage(p)}
                    className={`w-12 h-12 rounded-2xl font-black text-[10px] uppercase transition-all ${
                      page === p 
                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10 scale-110' 
                        : 'bg-white border border-slate-100 text-slate-400 hover:border-primary hover:text-primary shadow-sm'
                    }`}
                  >
                    {p}
                  </button>
                </div>
              ))}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-900 hover:border-primary disabled:opacity-30 transition-all shadow-sm"
          >
            →
          </button>
        </div>
      )}
      </div>
    </PlanGuard>
  );
}

