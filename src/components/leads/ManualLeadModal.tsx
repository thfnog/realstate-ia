'use client';

import { useState } from 'react';
import { IoClose, IoPersonOutline, IoCallOutline, IoMailOutline, IoHomeOutline, IoPeopleOutline } from 'react-icons/io5';
import { toast } from 'sonner';
import type { Corretor } from '@/lib/database.types';

interface ManualLeadModalProps {
  onClose: () => void;
  onSuccess: () => void;
  corretores: Corretor[];
}

export function ManualLeadModal({ onClose, onSuccess, corretores }: ManualLeadModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    corretor_id: '',
    tipo_interesse: 'apartamento',
    finalidade: 'comprar',
    descricao_interesse: '',
    orcamento: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          origem: 'manual',
          orcamento: form.orcamento ? parseFloat(form.orcamento) : undefined,
        }),
      });

      if (res.ok) {
        toast.success('Lead cadastrado com sucesso!');
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao cadastrar lead');
      }
    } catch (err) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Inserir Lead Manual</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all">
            <IoClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Dados do Cliente</label>
              <div className="grid grid-cols-1 gap-4">
                <div className="relative">
                  <IoPersonOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Nome do Lead"
                    value={form.nome}
                    onChange={e => setForm({ ...form, nome: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold"
                  />
                </div>
                <div className="relative">
                  <IoCallOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Telefone (com DDD)"
                    value={form.telefone}
                    onChange={e => setForm({ ...form, telefone: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold"
                  />
                </div>
                <div className="relative">
                  <IoMailOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="E-mail (opcional)"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Atribuição</label>
              <div className="relative">
                <IoPeopleOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={form.corretor_id}
                  onChange={e => setForm({ ...form, corretor_id: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold appearance-none"
                >
                  <option value="">Roleta Automática (ou não atribuído)</option>
                  {corretores.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Interesse</label>
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={form.tipo_interesse}
                  onChange={e => setForm({ ...form, tipo_interesse: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold outline-none"
                >
                  <option value="apartamento">Apartamento</option>
                  <option value="casa">Casa</option>
                  <option value="terreno">Terreno</option>
                  <option value="loja">Comercial</option>
                </select>
                <select
                  value={form.finalidade}
                  onChange={e => setForm({ ...form, finalidade: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold outline-none"
                >
                  <option value="comprar">Comprar</option>
                  <option value="alugar">Alugar</option>
                  <option value="investir">Investir</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Observações / Descrição</label>
              <textarea
                placeholder="Descreva o que o lead procura..."
                rows={3}
                value={form.descricao_interesse}
                onChange={e => setForm({ ...form, descricao_interesse: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-3 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
