'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegistroPage() {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [email, setEmail] = useState('');
  const [pswd, setPswd] = useState('');
  const [configPais, setConfigPais] = useState<'PT' | 'BR'>('PT');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeFantasia, email, pswd, configPais }),
      });

      if (res.ok) {
        // Once registered, we log the user in immediately via the login endpoint
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pswd }),
        });

        if (loginRes.ok) {
          router.push('/admin');
        } else {
          router.push('/login'); // Fallback if auto-login fails
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
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-3 text-white hover:opacity-80 transition-opacity">
            <span className="text-3xl">🏠</span>
            <span className="text-2xl font-bold">ImobIA</span>
          </Link>
          <p className="text-slate-400 mt-2">Criar conta para Imobiliária</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          
          {/* Progress bar */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-slate-200'}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`} />
          </div>

          <h1 className="text-xl font-bold text-text-primary mb-6">
            {step === 1 ? 'Dados da Agência' : 'Configurações de Região'}
          </h1>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-danger-light text-danger text-sm font-medium animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); setStep(2); }} className="space-y-4">
            
            {step === 1 && (
              <div className="animate-fade-in space-y-4">
                <div>
                  <label htmlFor="nomeFantasia" className="block text-sm font-medium text-text-primary mb-1.5">
                    Nome da Imobiliária (Fantasia)
                  </label>
                  <input
                    id="nomeFantasia"
                    type="text"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    placeholder="Ex: Century21 Lux, REMAX..."
                    required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1.5">
                    E-mail (Admin Principal)
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@suaimobiliaria.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="pswd" className="block text-sm font-medium text-text-primary mb-1.5">
                    Criar Senha
                  </label>
                  <input
                    id="pswd"
                    type="password"
                    value={pswd}
                    onChange={(e) => setPswd(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full py-3 mt-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
                >
                  Continuar →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in space-y-4">
                <p className="text-sm text-text-secondary mb-4">
                  Selecione o país de operação. Isto configurará a moeda Base (R$ / €) e todo o dicionário do sistema (Tipologias / Quartos).
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setConfigPais('BR')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      configPais === 'BR' 
                        ? 'border-primary bg-primary-subtle text-primary shadow-sm' 
                        : 'border-slate-200 hover:border-primary/40 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-4xl mb-2">🇧🇷</span>
                    <span className="font-semibold text-sm">Brasil</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfigPais('PT')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      configPais === 'PT' 
                        ? 'border-primary bg-primary-subtle text-primary shadow-sm' 
                        : 'border-slate-200 hover:border-primary/40 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-4xl mb-2">🇵🇹</span>
                    <span className="font-semibold text-sm">Portugal</span>
                  </button>
                </div>

                <div className="p-3 mb-4 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-700 font-medium">
                  Nota: Você começará com 3 Leads e 1 Evento pré-injetados para finalidades de demonstração.
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-5 py-3 rounded-xl bg-surface-alt hover:bg-surface-hover text-text-secondary font-semibold transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-primary/25"
                  >
                    {isLoading ? 'Criando Conta...' : '✨ Criar Conta e Entrar'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <p className="text-center text-slate-400 text-sm mt-6">
          Já tem uma conta de agência?{' '}
          <Link href="/login" className="text-primary hover:text-primary-light font-medium transition-colors underline decoration-primary/30 underline-offset-2">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
