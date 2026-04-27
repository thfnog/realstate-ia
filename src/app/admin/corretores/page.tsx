'use client';

import { useState, useEffect } from 'react';
import { IoAddOutline, IoCalendarOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoTrashOutline, IoLogoWhatsapp, IoMailOutline, IoCallOutline } from 'react-icons/io5';
import { LoadingSkeleton, TableRowSkeleton } from '@/components/LoadingSkeleton';
import WhatsAppConnector from '@/components/corretores/WhatsAppConnector';

interface Corretor {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  ativo: boolean;
  liberarAcesso?: boolean;
  comissao_padrao?: number;
}

export default function CorretoresPage() {
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', ativo: true, liberarAcesso: false, comissao_padrao: 5 });

  async function fetchCorretores() {
    try {
      setLoading(true);
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
    setForm({ nome: '', telefone: '', email: '', ativo: true, liberarAcesso: false, comissao_padrao: 5 });
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(c: Corretor) {
    setForm({ nome: c.nome, telefone: c.telefone, email: c.email || '', ativo: c.ativo, liberarAcesso: false, comissao_padrao: c.comissao_padrao || 0 });
    setEditingId(c.id);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let brokerId = editingId;
    
    if (editingId) {
      await fetch(`/api/corretores/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          telefone: form.telefone,
          email: form.email,
          ativo: form.ativo,
          comissao_padrao: form.comissao_padrao
        }),
      });
    } else {
      const res = await fetch('/api/corretores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          telefone: form.telefone,
          email: form.email,
          ativo: form.ativo,
          comissao_padrao: form.comissao_padrao
        }),
      });
      const data = await res.json();
      brokerId = data.id;
    }

    if (form.liberarAcesso && form.email && brokerId) {
      await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          role: 'corretor',
          corretor_id: brokerId,
          nome: form.nome
        }),
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
    <div className="animate-fade-in pb-20 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Consultores</h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie seu time de corretores e integrações WhatsApp.</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest transition-all hover:bg-primary hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95"
        >
          <IoAddOutline size={20} /> Novo consultor
        </button>
      </div>

      {loading ? (
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-[2rem] border border-slate-100 p-8 animate-pulse shadow-xl shadow-slate-200/50">
              <div className="flex items-center gap-6">
                <LoadingSkeleton className="w-16 h-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <LoadingSkeleton className="h-4 w-48" />
                  <LoadingSkeleton className="h-3 w-64" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : corretores.length === 0 ? (
        <div className="bg-white rounded-[3rem] border border-dashed border-slate-200 p-32 text-center">
          <p className="text-8xl mb-8 opacity-20">🤝</p>
          <p className="text-slate-500 font-black uppercase tracking-widest text-sm mb-10">Nenhum consultor cadastrado</p>
          <button 
            onClick={openNew} 
            className="px-10 py-4 rounded-2xl bg-primary/10 text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
          >
            Cadastrar primeiro consultor
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {corretores.map((c) => (
            <div
              key={c.id}
              onClick={() => openEdit(c)}
              className={`group bg-white rounded-[2rem] border p-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 cursor-pointer shadow-xl shadow-slate-200/40 ${
                c.ativo ? 'border-slate-100' : 'border-slate-100 opacity-60 bg-slate-50/50'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white font-black text-2xl shadow-lg transition-transform group-hover:scale-110 ${c.ativo ? 'bg-primary shadow-primary/20' : 'bg-slate-400 shadow-slate-400/20'}`}>
                    {c.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-primary transition-colors">{c.nome}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      <span className="flex items-center gap-1.5"><IoCallOutline className="text-slate-300" /> {c.telefone}</span>
                      {c.email && <span className="flex items-center gap-1.5"><IoMailOutline className="text-slate-300" /> {c.email}</span>}
                      {c.comissao_padrao !== undefined && <span className="flex items-center gap-1.5 text-primary"><span className="opacity-40">COMISSÃO:</span> {c.comissao_padrao}%</span>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAtivo(c); }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      c.ativo
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    {c.ativo ? <IoCheckmarkCircleOutline size={16} /> : <IoCloseCircleOutline size={16} />}
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); copyWebcalLink(c.id); }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                      copiedId === c.id 
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xl shadow-emerald-600/20' 
                        : 'bg-white border-slate-200 hover:border-primary hover:text-primary'
                    }`}
                    title="Copiar Link iCalendar / WebCal para Sincronização"
                  >
                    <IoCalendarOutline size={16} />
                    {copiedId === c.id ? 'Copiado!' : 'Sincronizar Agenda'}
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} 
                    className="p-3 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100"
                  >
                    <IoTrashOutline size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-6" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl animate-scale-in border border-white/20 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/50">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {editingId ? 'Editar Consultor' : 'Novo Consultor Profissional'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input type="text" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp (com DDI)</label>
                  <input type="text" required value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all" />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Comissão Padrão (%)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={form.comissao_padrao} 
                  onChange={(e) => setForm({ ...form, comissao_padrao: parseFloat(e.target.value) })} 
                  className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all" 
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={form.ativo}
                    onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-slate-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="ativo" className="text-xs font-black text-slate-700 uppercase tracking-widest cursor-pointer">Consultor Ativo na Plataforma</label>
                </div>

                {!editingId && (
                  <div className="flex items-center gap-6 p-6 bg-primary/5 rounded-[1.5rem] border border-primary/10 transition-all hover:bg-primary/10">
                    <input
                      type="checkbox"
                      id="liberarAcesso"
                      checked={form.liberarAcesso}
                      onChange={(e) => setForm({ ...form, liberarAcesso: e.target.checked })}
                      className="w-6 h-6 rounded-lg border-primary/30 text-primary focus:ring-primary"
                    />
                    <label htmlFor="liberarAcesso" className="text-xs font-black text-primary uppercase tracking-widest cursor-pointer leading-tight">
                      Liberar Acesso Web
                      <span className="block text-[10px] font-medium text-primary/60 lowercase mt-1 tracking-normal">Envia convite oficial para o e-mail do consultor</span>
                    </label>
                  </div>
                )}
              </div>

              {editingId && (
                <div className="pt-8 border-t border-slate-100">
                  <div className="flex items-center gap-3 mb-6">
                    <IoLogoWhatsapp className="text-emerald-500 text-2xl" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Integração WhatsApp Profissional</h3>
                  </div>
                  <WhatsAppConnector 
                    instanceName={`realstate-iabroker-${editingId}`} 
                    brokerId={editingId}
                  />
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">
                  Descartar
                </button>
                <button type="submit" className="px-10 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-slate-900/10">
                  {editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
