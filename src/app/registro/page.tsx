'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegistroPage() {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [identificadorFiscal, setIdentificadorFiscal] = useState('');
  const [numeroRegistro, setNumeroRegistro] = useState('');
  const [email, setEmail] = useState('');
  const [pswd, setPswd] = useState('');
  const [configPais, setConfigPais] = useState<'PT' | 'BR'>('BR');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [cartaoFinal, setCartaoFinal] = useState('');
  const [cartaoBandeira, setCartaoBandeira] = useState('');
  
  const [planos, setPlanos] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch('/api/master/planos')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPlanos(data);
          const freePlan = data.find(p => p.slug === 'essencial');
          if (freePlan) setSelectedPlanId(freePlan.id);
        }
      });
  }, []);

  const applyMask = (val: string, type: 'ID' | 'REG') => {
    if (type === 'ID') {
      const numeric = val.replace(/\D/g, '');
      if (configPais === 'BR') {
        let v = numeric.slice(0, 14);
        v = v.replace(/^(\d{2})(\d)/, '$1.$2');
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
        setIdentificadorFiscal(v);
      } else {
        let v = numeric.slice(0, 9);
        v = v.replace(/^(\d{3})(\d)/, '$1 $2');
        v = v.replace(/^(\d{3})\s(\d{3})(\d)/, '$1 $2 $3');
        setIdentificadorFiscal(v);
      }
    } else {
      setNumeroRegistro(val.toUpperCase());
    }
  };

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
          configPais,
          planoId: selectedPlanId,
          cartao_final: cartaoFinal,
          cartao_bandeira: cartaoBandeira
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
          <div className="bg-slate-50 border-b border-slate-200 px-8 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all ${step >= 1 ? 'bg-primary text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>1</div>
               <div className={`w-8 h-0.5 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`} />
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all ${step >= 2 ? 'bg-primary text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>2</div>
               <div className={`w-8 h-0.5 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-slate-200'}`} />
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all ${step >= 3 ? 'bg-primary text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>3</div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Passo {step} de 3</p>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                {step === 1 ? 'Identificação' : step === 2 ? 'Escolha do Plano' : 'Acesso & Pagamento'}
              </h2>
            </div>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold flex items-center gap-3 animate-shake">
                <span className="text-lg">⚠️</span>
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-sm font-bold text-slate-700">Região de Operação</span>
                  <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                    <div className="px-6 py-2 rounded-lg text-xs font-black bg-primary text-white shadow-md flex items-center gap-2">
                      🇧🇷 Brasil (Piloto)
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Fantasia</label>
                    <input
                      type="text"
                      value={nomeFantasia}
                      onChange={(e) => setNomeFantasia(e.target.value)}
                      placeholder="Ex: Century21 Lux, REMAX..."
                      className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                      {configPais === 'BR' ? 'CNPJ' : 'NIF'}
                    </label>
                    <input
                      type="text"
                      value={identificadorFiscal}
                      onChange={(e) => applyMask(e.target.value, 'ID')}
                      placeholder={configPais === 'BR' ? "00.000.000/0000-00" : "000 000 000"}
                      className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                      {configPais === 'BR' ? 'CRECI PJ' : 'Número AMI'}
                    </label>
                    <input
                      type="text"
                      value={numeroRegistro}
                      onChange={(e) => applyMask(e.target.value, 'REG')}
                      placeholder="Ex: 12345-J"
                      className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!nomeFantasia || !identificadorFiscal || !numeroRegistro) {
                      setError('Preencha os dados da imobiliária para prosseguir.');
                      return;
                    }
                    setStep(2);
                    setError('');
                  }}
                  className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 mt-4"
                >
                  Selecionar Plano ➜
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {planos.map(plano => (
                    <button
                      key={plano.id}
                      onClick={() => setSelectedPlanId(plano.id)}
                      className={`relative w-full text-left p-6 rounded-2xl border-2 transition-all ${selectedPlanId === plano.id ? 'border-primary bg-primary/5 shadow-lg' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                    >
                      {selectedPlanId === plano.id && (
                        <div className="absolute top-4 right-6 text-primary">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-2xl">{plano.preco_mensal === 0 ? '🌱' : plano.slug === 'profissional' ? '🚀' : '💎'}</span>
                        <div>
                          <h3 className="font-black text-slate-900 uppercase tracking-tight">{plano.nome}</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{plano.limite_usuarios} {plano.limite_usuarios === 1 ? 'Usuário' : 'Usuários'}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mb-4">{plano.descricao}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900">R$ {plano.preco_mensal.toLocaleString('pt-BR')}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase">/mês</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-[2] py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-primary/20"
                  >
                    Continuar ➜
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail do Administrador</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@exemplo.com"
                      className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Senha de Acesso</label>
                    <input
                      type="password"
                      value={pswd}
                      onChange={(e) => setPswd(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                    />
                  </div>

                  <div className="md:col-span-2">
                    {(planos.find(p => p.id === selectedPlanId)?.preco_mensal || 0) > 0 ? (
                      <div className="p-6 rounded-[2rem] bg-slate-900 text-white relative overflow-hidden group border border-white/10">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-150" />
                        <div className="relative z-10 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dados de Cobrança (Opcional)</h4>
                            <span className="text-[10px] px-2 py-0.5 bg-white/10 rounded-full font-black uppercase tracking-widest">PCI Secure</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex-1 bg-white/5 p-4 rounded-xl border border-white/10">
                               <input 
                                 value={cartaoFinal}
                                 onChange={e => setCartaoFinal(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                 className="bg-transparent border-none outline-none w-full font-mono text-lg placeholder:text-white/20" 
                                 placeholder="•••• •••• •••• 4482" 
                               />
                            </div>
                            <div className="w-24 bg-white/5 p-4 rounded-xl border border-white/10">
                               <input 
                                 value={cartaoBandeira}
                                 onChange={e => setCartaoBandeira(e.target.value)}
                                 className="bg-transparent border-none outline-none w-full text-xs font-black uppercase placeholder:text-white/20" 
                                 placeholder="VISA" 
                               />
                            </div>
                          </div>
                          <p className="text-[8px] text-white/40 font-medium uppercase tracking-widest">Você só será cobrado após o período de testes se optar por manter o plano.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center space-y-2">
                        <span className="text-2xl">🎁</span>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Plano Gratuito Selecionado</p>
                        <p className="text-xs text-slate-400 font-medium max-w-[280px]">Nenhuma informação de pagamento é necessária para começar agora.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="flex-[2] py-4 rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Finalizar Registro 🚀'
                    )}
                  </button>
                </div>
              </div>
            )}
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
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
