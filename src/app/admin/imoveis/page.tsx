'use client';

import { useEffect, useState } from 'react';
import type { Imovel, TipoImovel, StatusImovel, Moeda } from '@/lib/database.types';
import { getConfig, formatCurrency as formatCurrencyConfig } from '@/lib/countryConfig';

const emptyImovel = {
  tipo: 'apartamento' as TipoImovel,
  bairro: '',
  valor: '',
  area_m2: '',
  quartos: '',
  vagas: '',
  status: 'disponivel' as StatusImovel,
  link_fotos: '',
};

export default function ImoveisPage() {
  const config = getConfig();
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyImovel);

  async function fetchImoveis() {
    try {
      const res = await fetch('/api/imoveis');
      const data = await res.json();
      if (Array.isArray(data)) setImoveis(data);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchImoveis(); }, []);

  function openNew() {
    setForm(emptyImovel);
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(imovel: Imovel) {
    setForm({
      tipo: imovel.tipo,
      bairro: imovel.bairro,
      valor: String(imovel.valor),
      area_m2: imovel.area_m2 ? String(imovel.area_m2) : '',
      quartos: imovel.quartos ? String(imovel.quartos) : '',
      vagas: String(imovel.vagas),
      status: imovel.status,
      link_fotos: imovel.link_fotos || '',
    });
    setEditingId(imovel.id);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      tipo: form.tipo,
      bairro: form.bairro,
      valor: parseFloat(form.valor),
      area_m2: form.area_m2 ? parseFloat(form.area_m2) : null,
      quartos: form.quartos ? parseInt(form.quartos) : null,
      vagas: form.vagas ? parseInt(form.vagas) : 0,
      status: form.status,
      link_fotos: form.link_fotos || null,
      moeda: config.currency.code as Moeda,
    };

    if (editingId) {
      await fetch(`/api/imoveis/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      await fetch('/api/imoveis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    setShowModal(false);
    fetchImoveis();
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este imóvel?')) return;
    await fetch(`/api/imoveis/${id}`, { method: 'DELETE' });
    fetchImoveis();
  }

  function formatCurrency(value: number): string {
    return formatCurrencyConfig(value, config);
  }

  const statusBadge: Record<string, string> = {
    disponivel: 'bg-green-50 text-green-700 border-green-200',
    vendido: 'bg-red-50 text-red-700 border-red-200',
    alugado: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Imóveis</h1>
          <p className="text-text-secondary text-sm mt-1">{imoveis.length} imóvel(is) cadastrado(s)</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium text-sm transition-all hover:shadow-lg hover:shadow-primary/20"
        >
          ➕ Novo imóvel
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-border-light p-5 animate-pulse">
              <div className="h-4 w-40 bg-surface-alt rounded mb-3" />
              <div className="h-3 w-24 bg-surface-alt rounded" />
            </div>
          ))}
        </div>
      ) : imoveis.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-light p-12 text-center">
          <p className="text-4xl mb-3">🏠</p>
          <p className="text-text-secondary mb-4">Nenhum imóvel cadastrado</p>
          <button onClick={openNew} className="text-primary font-medium text-sm hover:underline">
            Cadastrar primeiro imóvel
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light bg-surface-alt/50">
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Bairro</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Valor</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Área</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">{config.terminology.quartosLabel}</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Vagas</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-text-secondary">Ações</th>
                </tr>
              </thead>
              <tbody>
                {imoveis.map((im) => (
                  <tr key={im.id} className="border-b border-border-light last:border-0 hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3 capitalize font-medium text-text-primary">{im.tipo}</td>
                    <td className="px-4 py-3 text-text-secondary">{im.bairro}</td>
                    <td className="px-4 py-3 text-text-primary font-medium">{formatCurrency(im.valor)}</td>
                    <td className="px-4 py-3 text-text-secondary">{im.area_m2 ? `${im.area_m2}m²` : '—'}</td>
                    <td className="px-4 py-3 text-text-secondary">{im.quartos || '—'}</td>
                    <td className="px-4 py-3 text-text-secondary">{im.vagas}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${statusBadge[im.status] || ''}`}>
                        {im.status === 'disponivel' ? 'Disponível' : im.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(im)} className="text-primary hover:text-primary-hover text-xs font-medium mr-3">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(im.id)} className="text-danger hover:text-red-700 text-xs font-medium">
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border-light">
              <h2 className="text-lg font-bold text-text-primary">
                {editingId ? 'Editar imóvel' : 'Novo imóvel'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoImovel })} className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <option value="apartamento">Apartamento</option>
                    <option value="casa">Casa</option>
                    <option value="terreno">Terreno</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusImovel })} className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <option value="disponivel">Disponível</option>
                    <option value="vendido">Vendido</option>
                    <option value="alugado">Alugado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Bairro</label>
                <input type="text" required value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Valor ({config.currency.symbol})</label>
                  <input type="number" required value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Área (m²)</label>
                  <input type="number" value={form.area_m2} onChange={(e) => setForm({ ...form, area_m2: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">{config.terminology.quartosLabel}</label>
                  <input type="number" value={form.quartos} onChange={(e) => setForm({ ...form, quartos: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Vagas</label>
                  <input type="number" value={form.vagas} onChange={(e) => setForm({ ...form, vagas: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Link de fotos (opcional)</label>
                <input type="url" value={form.link_fotos} onChange={(e) => setForm({ ...form, link_fotos: e.target.value })} placeholder="https://..." className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-alt transition-all">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all hover:shadow-lg hover:shadow-primary/20">
                  {editingId ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
