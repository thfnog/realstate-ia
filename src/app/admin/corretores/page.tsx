'use client';

import { useEffect, useState } from 'react';
import type { Corretor } from '@/lib/database.types';
import WhatsAppConnector from '@/components/corretores/WhatsAppConnector';

export default function CorretoresPage() {
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', ativo: true });

  async function fetchCorretores() {
    try {
      const res = await fetch('/api/corretores');
      const data = await res.json();
      if (Array.isArray(data)) setCorretores(data);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCorretores(); }, []);

  function openNew() {
    setForm({ nome: '', telefone: '', email: '', ativo: true });
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(c: Corretor) {
    setForm({ nome: c.nome, telefone: c.telefone, email: c.email || '', ativo: c.ativo });
    setEditingId(c.id);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingId) {
      await fetch(`/api/corretores/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } else {
      await fetch('/api/corretores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }

    setShowModal(false);
    fetchCorretores();
  }

  async function toggleAtivo(c: Corretor) {
    await fetch(`/api/corretores/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...c, ativo: !c.ativo }),
    });
    fetchCorretores();
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este corretor?')) return;
    await fetch(`/api/corretores/${id}`, { method: 'DELETE' });
    fetchCorretores();
  }

  function copyWebcalLink(id: string) {
    const uri = `${window.location.origin}/api/calendar/${id}.ics`;
    navigator.clipboard.writeText(uri).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      alert(`Link WebCal para partilha:\n${uri}`);
    });
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Corretores</h1>
          <p className="text-text-secondary text-sm mt-1">{corretores.length} corretor(es)</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium text-sm transition-all hover:shadow-lg hover:shadow-primary/20 w-full sm:w-auto"
        >
          ➕ Novo corretor
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-border-light p-5 animate-pulse">
              <div className="h-4 w-32 bg-surface-alt rounded mb-3" />
              <div className="h-3 w-48 bg-surface-alt rounded" />
            </div>
          ))}
        </div>
      ) : corretores.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-light p-12 text-center">
          <p className="text-4xl mb-3">🤝</p>
          <p className="text-text-secondary mb-4">Nenhum corretor cadastrado</p>
          <button onClick={openNew} className="text-primary font-medium text-sm hover:underline">
            Cadastrar primeiro corretor
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {corretores.map((c) => (
            <div
              key={c.id}
              className={`bg-white rounded-xl border p-5 transition-all duration-200 hover:shadow-md ${
                c.ativo ? 'border-border-light' : 'border-border-light opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${c.ativo ? 'bg-primary' : 'bg-slate-400'}`}>
                    {c.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">{c.nome}</h3>
                    <div className="flex items-center gap-3 text-sm text-text-secondary">
                      <span>{c.telefone}</span>
                      {c.email && <span>• {c.email}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleAtivo(c)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      c.ativo
                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                  <button
                    onClick={() => copyWebcalLink(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      copiedId === c.id 
                        ? 'bg-green-500 text-white border-green-600 shadow-inner' 
                        : 'bg-surface-alt border-slate-200 hover:bg-white text-slate-700 hover:text-primary hover:border-primary/40'
                    }`}
                    title="Copiar Link iCalendar / WebCal para Sincronização"
                  >
                    <span>{copiedId === c.id ? '✅' : '📅'}</span>
                    <span className="hidden sm:inline">
                      {copiedId === c.id ? 'Copiado!' : 'WebCal'}
                    </span>
                  </button>
                  <button onClick={() => openEdit(c)} className="text-primary hover:text-primary-hover text-xs font-medium shrink-0">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="text-danger hover:text-red-700 text-xs font-medium shrink-0">
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border-light">
              <h2 className="text-lg font-bold text-text-primary">
                {editingId ? 'Editar corretor' : 'Novo corretor'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Nome</label>
                <input type="text" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Telefone (WhatsApp)</label>
                <input type="text" required value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">E-mail</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="ativo" className="text-sm text-text-primary">Ativo</label>
              </div>

              {editingId && (
                <div className="pt-2 border-t border-border-light mt-4">
                  <WhatsAppConnector 
                    instanceName={`realstate-iabroker-${editingId}`} 
                    onStatusChange={async (status) => {
                      // Opcional: Atualizar status do corretor no banco para feedback visual na lista
                      // fetch(`/api/corretores/${editingId}`, { method: 'PATCH', body: JSON.stringify({ whatsapp_status: status }) });
                    }}
                  />
                </div>
              )}

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
