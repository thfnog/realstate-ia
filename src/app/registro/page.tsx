'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegistroPage() {
  const router = useRouter();
  
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [identificadorFiscal, setIdentificadorFiscal] = useState('');
  const [numeroRegistro, setNumeroRegistro] = useState('');
  const [email, setEmail] = useState('');
  const [pswd, setPswd] = useState('');
  const [configPais, setConfigPais] = useState<'PT' | 'BR'>('BR');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Masking helpers
  const applyMask = (val: string, type: 'ID' | 'REG') => {
    if (type === 'ID') {
      const numeric = val.replace(/\D/g, '');
      if (configPais === 'BR') {
        // CNPJ: 00.000.000/0000-00
        let v = numeric.slice(0, 14);
        v = v.replace(/^(\d{2})(\d)/, '$1.$2');
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
        setIdentificadorFiscal(v);
      } else {
        // NIF: 000 000 000
        let v = numeric.slice(0, 9);
        v = v.replace(/^(\d{3})(\d)/, '$1 $2');
        v = v.replace(/^(\d{3})\s(\d{3})(\d)/, '$1 $2 $3');
        setIdentificadorFiscal(v);
      }
    } else {
      // For Registo (CRECI/AMI), we usually keep it alphanumeric but can add prefixes
      setNumeroRegistro(val.toUpperCase());
    }
  };

  // Clear fields when toggling country to avoid invalid masks
  useEffect(() => {
    setIdentificadorFiscal('');
    setNumeroRegistro('');
    setError('');
  }, [configPais]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cleanID = identificadorFiscal.replace(/\D/g, '');
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nomeFantasia, 
          identificadorFiscal: cleanID, 
          numeroRegistro,
          email, 
          pswd, 
          configPais 
        }),
      });

      if (res.ok) {
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pswd }),
        });

        if (loginRes.ok) {
          router.push('/admin');
        } else {
          router.push('/login');
        }
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao tentar cadastrar agência.');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />

      <div className="w-full max-w-xl relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 text-white hover:scale-105 transition-transform">
            <span className="text-4xl drop-shadow-md">🏠</span>
            <span className="text-3xl font-extrabold tracking-tight">Imob<span className="text-primary">IA</span></span>
          </Link>
          <p className="text-slate-400 mt-2 font-medium">Plataforma de Operações Imobiliárias Inteligentes</p>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden border border-white/10">
          <div className="bg-slate-50 border-b border-slate-200 px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Novo Registro</h1>
              <p className="text-slate-500 text-sm">Configure sua agência e comece em minutos.</p>
            </div>
            
            <div className="flex bg-slate-200 p-1 rounded-xl">
              <div className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-black text-primary bg-white shadow-sm">
                <span className="text-lg">🇧🇷</span> Brasil (Piloto)
              </div>
            </div>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold flex items-center gap-3 animate-shake">
                <span className="text-lg">⚠️</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Nome da Imobiliária (Fantasia)
                </label>
                <input
                  type="text"
                  required
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  placeholder="Ex: Century21 Lux, REMAX..."
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  CNPJ
                </label>
                <input
                  type="text"
                  required
                  value={identificadorFiscal}
                  onChange={(e) => applyMask(e.target.value, 'ID')}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  CRECI PJ
                </label>
                <input
                  type="text"
                  required
                  value={numeroRegistro}
                  onChange={(e) => applyMask(e.target.value, 'REG')}
                  placeholder="Ex: 12345-J"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                />
              </div>

              <div className="md:col-span-2">
                <div className="h-px bg-slate-100 w-full my-2" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  E-mail do Administrador
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@imobiliaria.com"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Senha de Acesso
                </label>
                <input
                  type="password"
                  required
                  value={pswd}
                  onChange={(e) => setPswd(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                />
              </div>

              <div className="md:col-span-2 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-lg font-bold transition-all duration-300 shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      🚀 Criar Agência e Iniciar
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-slate-400 mt-4 leading-relaxed italic">
                  * Ao registrar, você terá acesso imediato ao painel administrativo com 3 leads e 1 imóvel de demonstração injetados para acelerar os testes ({configPais === 'BR' ? 'BRL/R$' : 'EUR/€'}).
                </p>
              </div>
            </form>
          </div>
        </div>

        <p className="text-center text-slate-400 text-sm mt-8">
          Já possui acesso?{' '}
          <Link href="/login" className="text-white hover:text-primary font-bold transition-colors underline decoration-primary/30 underline-offset-4 decoration-2">
            Fazer Login
          </Link>
        </p>
      </div>
      
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
