'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function AuthConfirmPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if we are already authenticated via the hash/recovery link
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setVerifying(false);
      } else {
        // If no session, maybe it's an expired link or just wrong page access
        setTimeout(() => {
          if (verifying) {
            toast.error('Sessão de ativação não encontrada ou expirada.');
            router.push('/login');
          }
        }, 3000);
      }
    };
    checkSession();
  }, [router, verifying]);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error('As senhas não coincidem');
    }
    if (password.length < 6) {
      return toast.error('A senha deve ter pelo menos 6 caracteres');
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast.success('Senha definida com sucesso! Redirecionando...');
      
      // Clear legacy auth cookie if exists and redirect to login to get a fresh custom JWT
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao definir senha');
    } finally {
      setLoading(false);
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary font-medium">Verificando convite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="bg-primary p-10 text-white text-center">
          <h1 className="text-3xl font-black tracking-tight">Ative sua Conta</h1>
          <p className="text-white/70 mt-2">Defina sua senha de acesso ao ImobIA</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="p-10 space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nova Senha</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-border-light text-sm focus:outline-none focus:border-primary transition-all bg-surface-alt/30" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Confirmar Senha</label>
            <input 
              type="password" 
              required 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-border-light text-sm focus:outline-none focus:border-primary transition-all bg-surface-alt/30" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-black transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Ativar Minha Conta'}
          </button>
        </form>
      </div>
    </div>
  );
}
