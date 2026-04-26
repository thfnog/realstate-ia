'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Usuario {
  id: string;
  email: string;
  role: string;
  corretor_id?: string;
  corretores?: { nome: string };
  criado_em: string;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'corretor' });
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
        setInviteForm({ email: '', role: 'corretor' });
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
    <div className="animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Gestão de Usuários</h1>
          <p className="text-text-secondary text-sm mt-1">Gerencie quem tem acesso ao painel da sua imobiliária</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-95"
        >
          <span>✉️</span> Convidar Usuário
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-border-light overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-alt/50 border-b border-border-light">
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Usuário</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nível de Acesso</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Vínculo</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={4} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                </tr>
              ))
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-text-secondary italic">Nenhum usuário cadastrado</td>
              </tr>
            ) : (
              usuarios.map((u) => {
                const isSelf = currentUser?.usuario_id === u.id;
                return (
                  <tr key={u.id} className={`hover:bg-surface-alt/30 transition-colors ${isSelf ? 'bg-primary/5' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-text-primary text-sm">{u.email}</span>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-black uppercase">Você</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">{u.id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        u.role === 'admin' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-text-secondary font-medium">
                          {u.corretores?.nome || (
                            <span className="text-slate-300 italic text-xs">Sem vínculo</span>
                          )}
                        </span>
                        {u.role === 'admin' && !u.corretor_id && (
                           <button 
                             onClick={() => alert('Em breve: Vincular admin a um perfil de corretor para uso do WhatsApp.')}
                             className="text-[10px] text-primary hover:underline font-bold mt-0.5"
                           >
                             + Criar Perfil de Corretor
                           </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={async () => {
                            if (confirm('Reenviar convite para este usuário?')) {
                              try {
                                const res = await fetch('/api/admin/users', {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ userId: u.id, action: 'resend_invite' }),
                                });
                                if (res.ok) toast.success('Convite reenviado!');
                                else toast.error('Erro ao reenviar');
                              } catch { toast.error('Erro de conexão'); }
                            }
                          }}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Reenviar Convite"
                        >
                          ✉️
                        </button>
                        <button
                          disabled={isSelf}
                          onClick={async () => {
                            if (confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
                              try {
                                const res = await fetch(`/api/admin/users?id=${u.id}`, { method: 'DELETE' });
                                if (res.ok) {
                                  toast.success('Usuário excluído');
                                  fetchUsuarios();
                                } else {
                                  const data = await res.json();
                                  toast.error(data.error || 'Erro ao excluir');
                                }
                              } catch { toast.error('Erro de conexão'); }
                            }
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            isSelf ? 'opacity-20 cursor-not-allowed grayscale' : 'hover:bg-red-50 text-red-600'
                          }`}
                          title={isSelf ? 'Você não pode se excluir' : 'Excluir Usuário'}
                        >
                          🗑️
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

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="bg-primary px-8 py-10 text-white relative">
              <h2 className="text-2xl font-black tracking-tight">Convidar Novo Usuário</h2>
              <p className="text-white/70 text-sm mt-1">O usuário receberá um e-mail para ativar a conta.</p>
              <button onClick={() => setShowInviteModal(false)} className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleInvite} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">E-mail do Convidado</label>
                <input 
                  type="email" 
                  required 
                  value={inviteForm.email}
                  onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="exemplo@email.com"
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-border-light text-sm focus:outline-none focus:border-primary transition-all bg-surface-alt/30" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nível de Acesso</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInviteForm({ ...inviteForm, role: 'corretor' })}
                    className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                      inviteForm.role === 'corretor' 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-border-light text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    🤝 Corretor
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteForm({ ...inviteForm, role: 'admin' })}
                    className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                      inviteForm.role === 'admin' 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-border-light text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    👑 Admin
                  </button>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowInviteModal(false)}
                  className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-black transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Enviando...' : 'Enviar Convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
