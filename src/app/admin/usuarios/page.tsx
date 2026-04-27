'use client';

import { useState, useEffect } from 'react';
import { IoMailOutline, IoPersonAddOutline, IoShieldCheckmarkOutline, IoTrashOutline, IoSyncOutline } from 'react-icons/io5';
import { TableRowSkeleton } from '@/components/LoadingSkeleton';
import { toast } from 'sonner';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'corretor', nome: '', vincular_corretor: false });
  const [submitting, setSubmitting] = useState(false);

  async function fetchCurrentUser() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setCurrentUser(data);
    } catch (err) {
      console.error('Erro ao carregar sessão:', err);
    }
  }

  async function fetchUsuarios() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsuarios(data);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCurrentUser();
    fetchUsuarios();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Convite enviado com sucesso!');
        setShowInviteModal(false);
        setInviteForm({ email: '', role: 'corretor', nome: '', vincular_corretor: false });
        fetchUsuarios();
      } else {
        toast.error(data.error || 'Erro ao enviar convite');
      }
    } catch (err) {
      toast.error('Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in pb-20 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Gestão de Usuários</h1>
          <p className="text-slate-500 font-medium mt-1">Controle de acesso e permissões administrativas da plataforma.</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest transition-all hover:bg-primary hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95"
        >
          <IoPersonAddOutline size={20} /> Convidar Usuário
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identidade</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível de Acesso</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vínculo</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-24 text-center">
                     <p className="text-6xl mb-6 opacity-20">👥</p>
                     <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Nenhum usuário cadastrado</p>
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => {
                  const isSelf = currentUser?.usuario_id === u.id;
                  return (
                    <tr key={u.id} className={`group hover:bg-slate-50/50 transition-all duration-300 ${isSelf ? 'bg-primary/5' : ''}`}>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg ${isSelf ? 'bg-primary shadow-primary/20' : 'bg-slate-200 text-slate-500'}`}>
                            {u.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-3">
                              <span className="font-black text-slate-900 text-sm tracking-tight">{u.email}</span>
                              {isSelf && (
                                <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest">Sua Conta</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">ID: {u.id.slice(0, 12)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm flex items-center w-fit gap-2 ${
                          u.role === 'admin' 
                            ? 'bg-amber-50 text-amber-600 border-amber-100' 
                            : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                        }`}>
                          <IoShieldCheckmarkOutline size={14} />
                          {u.role === 'admin' ? 'Administrador' : 'Consultor'}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-700 font-black uppercase tracking-widest">
                            {u.corretores?.nome || (
                              <span className="text-slate-300 font-medium italic">Sem vínculo</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          u.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700 animate-pulse'
                        }`}>
                          {u.status === 'active' ? 'Ativado' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={async () => {
                              if (confirm('Reenviar convite de ativação para este usuário?')) {
                                try {
                                  const res = await fetch('/api/admin/users', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: u.id, action: 'resend_invite' }),
                                  });
                                  if (res.ok) toast.success('Convite reenviado com sucesso!');
                                  else toast.error('Falha ao reenviar');
                                } catch { toast.error('Erro de conexão crítica'); }
                              }
                            }}
                            className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100"
                            title="Reenviar Convite"
                          >
                            <IoSyncOutline size={18} />
                          </button>
                          <button
                            disabled={isSelf}
                            onClick={async () => {
                              if (confirm('REMOVER ACESSO: Tem certeza que deseja excluir este usuário permanentemente?')) {
                                try {
                                  const res = await fetch(`/api/admin/users?id=${u.id}`, { method: 'DELETE' });
                                  if (res.ok) {
                                    toast.success('Usuário removido da base');
                                    fetchUsuarios();
                                  } else {
                                    const data = await res.json();
                                    toast.error(data.error || 'Erro ao processar exclusão');
                                  }
                                } catch { toast.error('Erro de conexão ao servidor'); }
                              }
                            }}
                            className={`p-3 rounded-xl transition-all border ${
                              isSelf 
                                ? 'opacity-10 border-slate-100 bg-slate-50 cursor-not-allowed' 
                                : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100'
                            }`}
                            title={isSelf ? 'Você não pode remover seu próprio acesso' : 'Excluir Usuário'}
                          >
                            <IoTrashOutline size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-6 animate-fade-in" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-scale-in border border-white/20" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 px-10 py-12 text-white relative">
              <h2 className="text-3xl font-black tracking-tight mb-2">Convidar Operador</h2>
              <p className="text-slate-400 font-medium">Um convite oficial de acesso será enviado para o endereço abaixo.</p>
              <button onClick={() => setShowInviteModal(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white transition-all">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleInvite} className="p-12 space-y-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input 
                  type="text" 
                  required 
                  value={inviteForm.nome}
                  onChange={e => setInviteForm({ ...inviteForm, nome: e.target.value })}
                  placeholder="Ex: João Silva"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all" 
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                <div className="relative">
                   <IoMailOutline className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
                   <input 
                     type="email" 
                     required 
                     value={inviteForm.email}
                     onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                     placeholder="operador@imobiliaria.com"
                     className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-16 pr-8 py-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all" 
                   />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nível de Permissões</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setInviteForm({ ...inviteForm, role: 'corretor' })}
                    className={`px-8 py-5 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                      inviteForm.role === 'corretor' 
                        ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10' 
                        : 'border-slate-100 text-slate-400 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    🤝 Consultor
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteForm({ ...inviteForm, role: 'admin' })}
                    className={`px-8 py-5 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                      inviteForm.role === 'admin' 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-lg shadow-indigo-600/10' 
                        : 'border-slate-100 text-slate-400 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    👑 Administrador
                  </button>
                </div>
              </div>

              {inviteForm.role === 'admin' && (
                <div className="flex items-center gap-4 p-6 bg-primary/5 rounded-2xl border border-primary/10">
                  <input 
                    type="checkbox" 
                    id="vincular"
                    checked={inviteForm.vincular_corretor}
                    onChange={e => setInviteForm({ ...inviteForm, vincular_corretor: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="vincular" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Também atua como Consultor? <span className="text-slate-400 font-medium">(Cria perfil para WhatsApp e Agenda)</span>
                  </label>
                </div>
              )}

              <div className="pt-6 flex items-center justify-between gap-6">
                <button 
                  type="button" 
                  onClick={() => setShowInviteModal(false)}
                  className="text-[10px] font-black text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest"
                >
                  Descartar
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-12 py-5 rounded-2xl bg-slate-900 hover:bg-primary text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? 'Processando Convite...' : 'Enviar Convite Oficial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
