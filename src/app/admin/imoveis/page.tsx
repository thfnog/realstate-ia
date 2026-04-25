'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Imovel, TipoImovel, StatusImovel, Moeda } from '@/lib/database.types';
import { getConfigByCode, formatCurrency as formatCurrencyConfig, CountryConfig } from '@/lib/countryConfig';

export default function ImoveisPage() {
  const router = useRouter();
  const [config, setConfig] = useState<CountryConfig>(getConfigByCode('PT'));
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', tipo: '' });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
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
      const res = await fetch(`/api/imoveis?page=${page}&limit=${LIMIT}`);
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

  useEffect(() => { 
    fetchConfig();
  }, []);

  useEffect(() => {
    fetchImoveis();
  }, [page]);

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
    disponivel: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    reservado: 'bg-amber-50 text-amber-700 border-amber-200',
    vendido: 'bg-rose-50 text-rose-700 border-rose-200',
    arrendado: 'bg-sky-50 text-sky-700 border-sky-200',
    retirado: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  const filtered = imoveis.filter(im => {
    if (filter.status && im.status !== filter.status) return false;
    if (filter.tipo && im.tipo !== filter.tipo) return false;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const refMatch = im.referencia?.toLowerCase().includes(term);
      const titleMatch = im.titulo?.toLowerCase().includes(term);
      const concelhoMatch = im.concelho?.toLowerCase().includes(term);
      const freguesiaMatch = im.freguesia?.toLowerCase().includes(term);
      if (!refMatch && !titleMatch && !concelhoMatch && !freguesiaMatch) return false;
    }
    
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Gestão de Imóveis</h1>
          <p className="text-text-secondary text-sm mt-1">Gerencie sua carteira de imóveis para {config.label}.</p>
        </div>
        <Link
          href="/admin/imoveis/novo"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
        >
          <span className="text-xl">🏠</span>
          Captar novo imóvel
        </Link>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-border-light shadow-sm">
             <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Total na Carteira</p>
             <p className="text-2xl font-black text-text-primary">{totalCount}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-border-light shadow-sm">
             <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Disponíveis</p>
             <p className="text-2xl font-black text-emerald-600">{imoveis.filter(i => i.status === 'disponivel').length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-border-light shadow-sm">
             <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Em Negociação</p>
             <p className="text-2xl font-black text-amber-500">{imoveis.filter(i => i.status === 'reservado').length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-border-light shadow-sm">
             <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Fechados</p>
             <p className="text-2xl font-black text-primary">{imoveis.filter(i => i.status === 'vendido' || i.status === 'arrendado').length}</p>
          </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-alt/50 p-4 rounded-2xl flex flex-wrap gap-4 items-center border border-border-light">
          <div className="flex-1 min-w-[200px] relative">
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">🔍</span>
             <input 
                type="text"
                placeholder="Buscar por referência, título ou cidade..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-border-light rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
             />
          </div>

          <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-text-secondary uppercase">Status:</span>
             <select 
                value={filter.status} 
                onChange={e => setFilter({...filter, status: e.target.value})}
                className="bg-white border border-border-light rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
             >
                <option value="">Todos</option>
                <option value="disponivel">Disponíveis</option>
                <option value="reservado">Reservados</option>
                <option value="vendido">Vendidos</option>
             </select>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-text-secondary uppercase">Tipo:</span>
             <select 
                value={filter.tipo} 
                onChange={e => setFilter({...filter, tipo: e.target.value})}
                className="bg-white border border-border-light rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
             >
                <option value="">Todos</option>
                <option value="apartamento">Apartamento</option>
                <option value="casa">Casa</option>
                <option value="terreno">Terreno</option>
             </select>
          </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl border border-border-light h-64 animate-pulse shadow-sm" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-border-light p-20 text-center shadow-sm">
          <p className="text-6xl mb-6 scale-110">🏠</p>
          <h2 className="text-xl font-bold text-text-primary">Nenhum imóvel encontrado</h2>
          <p className="text-text-secondary mt-2 mb-8">Comece captando seu primeiro imóvel para a agência.</p>
          <Link href="/admin/imoveis/novo" className="px-8 py-3 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20">
            Captar primeiro imóvel
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((im) => (
            <div 
              key={im.id} 
              onClick={() => router.push(`/admin/imoveis/${im.id}`)}
              className="group bg-white rounded-3xl border border-border-light overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            >
              {/* Image Preview */}
              <div className="relative h-48 bg-surface-alt overflow-hidden">
                {im.fotos && (im.fotos as any[]).length > 0 ? (
                  <img 
                    src={proxyImage((im.fotos as any[]).find(f => f.is_capa)?.url_media || (im.fotos as any[])[0].url_media || (im.fotos as any[])[0])} 
                    alt={im.titulo} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                    <span className="text-4xl">📸</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider mt-2">Sem Fotos</span>
                  </div>
                )}
                
                <div className="absolute top-4 left-4">
                   <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-sm ${statusBadge[im.status]}`}>
                      {im.status}
                   </span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                   <div>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">{im.tipo} • {im.concelho}</p>
                      <h3 className="font-bold text-text-primary line-clamp-1 group-hover:text-primary transition-colors">{im.titulo || 'Imóvel sem título'}</h3>
                   </div>
                </div>

                <div className="flex gap-4 mt-4 py-3 border-y border-border-light/50">
                    <div className="flex items-center gap-1">
                       <span className="text-xs">🛏️</span>
                       <span className="text-xs font-bold text-text-secondary">{im.quartos || '—'} {config.terminology.quartosLabel}</span>
                    </div>
                    <div className="flex items-center gap-1">
                       <span className="text-xs">📐</span>
                       <span className="text-xs font-bold text-text-secondary">{im.area_util || im.area_bruta || '—'} m²</span>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-6">
                   <span className="text-lg font-black text-text-primary">
                      {formatCurrencyConfig(im.valor, config)}
                   </span>
                   
                   <div className="flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(im.id); }}
                        className="p-2 rounded-xl bg-surface-alt hover:bg-rose-50 hover:text-rose-600 text-text-secondary transition-all"
                        title="Excluir"
                      >
                         🗑️
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
        <div className="flex items-center justify-center gap-2 pt-8 pb-12">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-border-light text-text-primary hover:border-primary disabled:opacity-30 transition-all"
          >
            ←
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, i, arr) => (
                <div key={p} className="flex items-center">
                  {i > 0 && arr[i-1] !== p - 1 && <span className="px-2 text-text-muted">...</span>}
                  <button
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-xl font-bold text-xs transition-all ${
                      page === p 
                        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110' 
                        : 'bg-white border border-border-light text-text-secondary hover:border-primary'
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
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-border-light text-text-primary hover:border-primary disabled:opacity-30 transition-all"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}

