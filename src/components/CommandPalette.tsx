'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, Home, UserCheck, X, Command } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'lead' | 'imovel' | 'corretor';
  title: string;
  subtitle: string;
  href: string;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        console.log('[DEBUG] CommandPalette toggle');
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedIndex(0);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Fetch all data for filtering (Pragmatic approach for MVP)
        const [leadsRes, imoveisRes, corretoresRes] = await Promise.all([
          fetch('/api/leads?limit=100'),
          fetch('/api/imoveis'),
          fetch('/api/corretores')
        ]);

        const leads = await leadsRes.json();
        const imoveis = await imoveisRes.json();
        const corretores = await corretoresRes.json();

        const searchResults: SearchResult[] = [];

        // Leads
        if (leads.data) {
          leads.data.forEach((l: any) => {
            if (l.nome.toLowerCase().includes(query.toLowerCase()) || l.telefone.includes(query)) {
              searchResults.push({
                id: l.id,
                type: 'lead',
                title: l.nome,
                subtitle: `Lead • ${l.status}`,
                href: `/admin/leads`, // Ideally opens the modal directly, but for now leads page
              });
            }
          });
        }

        // Imóveis
        if (Array.isArray(imoveis)) {
          imoveis.forEach((i: any) => {
            if (i.referencia.toLowerCase().includes(query.toLowerCase()) || i.tipo.toLowerCase().includes(query.toLowerCase())) {
              searchResults.push({
                id: i.id,
                type: 'imovel',
                title: i.referencia,
                subtitle: `${i.tipo} • ${i.bairro || ''}`,
                href: `/admin/imoveis`,
              });
            }
          });
        }

        // Corretores
        if (Array.isArray(corretores)) {
          corretores.forEach((c: any) => {
            if (c.nome.toLowerCase().includes(query.toLowerCase())) {
              searchResults.push({
                id: c.id,
                type: 'corretor',
                title: c.nome,
                subtitle: `Corretor • ${c.email}`,
                href: `/admin/corretores`,
              });
            }
          });
        }

        setResults(searchResults.slice(0, 8));
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (results.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (results.length || 1)) % (results.length || 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex].href);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-up"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="relative border-b border-slate-100 p-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-lg"
            placeholder="Buscar por nome, telefone, referência..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
          {loading && (
            <div className="p-8 flex flex-col items-center justify-center gap-3 text-slate-400">
               <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
               <p className="text-sm">Buscando...</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-1">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                    index === selectedIndex ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-slate-50 border-l-4 border-transparent'
                  }`}
                  onClick={() => handleSelect(result.href)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    result.type === 'lead' ? 'bg-blue-100 text-blue-600' : 
                    result.type === 'imovel' ? 'bg-purple-100 text-purple-600' : 
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    {result.type === 'lead' ? <User className="w-5 h-5" /> : 
                     result.type === 'imovel' ? <Home className="w-5 h-5" /> : 
                     <UserCheck className="w-5 h-5" />}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">{result.title}</h4>
                    <p className="text-xs text-slate-500">{result.subtitle}</p>
                  </div>
                  <div className="text-slate-300">
                    <Search className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="p-12 text-center text-slate-400">
               <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
               <p className="text-sm font-medium">Nenhum resultado encontrado para "{query}"</p>
            </div>
          )}

          {!query && (
            <div className="p-8 text-center">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Busca Rápida</p>
               <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => handleSelect('/admin/leads')} className="p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 transition-all text-slate-600 flex flex-col items-center gap-2">
                     <User className="w-6 h-6" />
                     <span className="text-[10px] font-bold uppercase">Leads</span>
                  </button>
                  <button onClick={() => handleSelect('/admin/imoveis')} className="p-4 rounded-2xl bg-slate-50 hover:bg-purple-50 hover:text-purple-600 transition-all text-slate-600 flex flex-col items-center gap-2">
                     <Home className="w-6 h-6" />
                     <span className="text-[10px] font-bold uppercase">Imóveis</span>
                  </button>
                  <button onClick={() => handleSelect('/admin/agenda')} className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 transition-all text-slate-600 flex flex-col items-center gap-2">
                     <Command className="w-6 h-6" />
                     <span className="text-[10px] font-bold uppercase">Agenda</span>
                  </button>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
           <div className="flex gap-4">
              <span className="flex items-center gap-1">
                 <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">Enter</kbd> Selecionar
              </span>
              <span className="flex items-center gap-1">
                 <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↑↓</kbd> Navegar
              </span>
           </div>
           <span className="text-slate-300">ImobIA v2.0 Search</span>
        </div>
      </div>
    </div>
  );
}
