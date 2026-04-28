'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { IoLogoWhatsapp } from 'react-icons/io5';
import WhatsAppConnector from '@/components/corretores/WhatsAppConnector';

export default function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ nome: '', telefone: '' });

  async function fetchProfile() {
    try {
      const res = await fetch('/api/auth/profile');
      const data = await res.json();
      if (data) {
        setUser(data);
        setForm({
          nome: data.corretores?.nome || '',
          telefone: data.corretores?.telefone || ''
        });
      }
    } catch (err) {
      toast.error('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { nome, telefone } = form;
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success('Perfil atualizado com sucesso!');
        fetchProfile();
      } else {
        toast.error('Erro ao atualizar perfil');
      }
    } catch (err) {
      toast.error('Erro de conexão');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">A carregar seu perfil...</div>;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-text-primary tracking-tight">Meu Perfil</h1>
        <p className="text-text-secondary text-sm mt-1">Gerencie suas informações pessoais e de contato</p>
      </div>

      <div className="bg-white rounded-3xl border border-border-light shadow-sm overflow-hidden">
        <div className="bg-primary/5 px-8 py-6 border-b border-border-light">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-black">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">{user?.email}</p>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border mt-1 inline-block ${
                user?.role === 'admin' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-blue-100 text-blue-700 border-blue-200'
              }`}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nome Completo</label>
              <input
                type="text"
                required
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder="Seu nome"
                className="w-full px-4 py-3.5 rounded-xl border-2 border-border-light text-sm focus:outline-none focus:border-primary transition-all bg-surface-alt/30 font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Telefone / WhatsApp</label>
              <input
                type="text"
                required
                value={form.telefone}
                onChange={e => setForm({ ...form, telefone: e.target.value })}
                placeholder="+351 9xx xxx xxx ou +55 11 9xxxx-xxxx"
                className="w-full px-4 py-3.5 rounded-xl border-2 border-border-light text-sm focus:outline-none focus:border-primary transition-all bg-surface-alt/30 font-medium"
              />
            </div>


          </div>

          <div className="pt-4 border-t border-border-light flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-black transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Alterações'}
            </button>
          </div>
        </form>
      </div>

      {user?.corretores?.id && (
        <div className="mt-8 bg-white rounded-3xl border border-border-light shadow-sm p-8 space-y-8 animate-fade-in">
          <div className="flex items-center gap-3">
            <IoLogoWhatsapp className="text-emerald-500 text-3xl" />
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Integração WhatsApp Bot</h3>
              <p className="text-slate-500 text-xs font-medium">Conecte seu WhatsApp para que o Motor de IA possa responder leads em seu nome.</p>
            </div>
          </div>
          
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <WhatsAppConnector 
              instanceName={`realstate-iabroker-${user.corretores.id}`} 
              brokerId={user.corretores.id}
            />
          </div>
          
          <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-xl">🔒</span>
            <p className="text-[10px] text-emerald-800 font-medium leading-relaxed">
              <strong>Segurança Garantida:</strong> Por questões de privacidade, a conexão do bot deve ser feita exclusivamente pelo proprietário do número. Nenhum administrador tem acesso às suas conversas privadas.
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 p-6 bg-amber-50 rounded-2xl border border-amber-100">
        <div className="flex gap-4">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="text-sm font-bold text-amber-900">Dica de Atendimento</h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              O seu nome e telefone são usados pelo Motor de IA para se apresentar aos leads e agendar visitas. 
              Mantenha-os atualizados para garantir que os clientes consigam entrar em contato consigo sem problemas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
