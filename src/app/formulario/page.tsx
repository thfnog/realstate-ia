'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { LeadFormData, Finalidade } from '@/lib/database.types';
import { CountryConfig, getConfigByCode } from '@/lib/countryConfig';
import { useSearchParams } from 'next/navigation';

type InputMode = 'livre' | 'detalhado';

const stepLabels = ['Seus dados', 'Seu interesse', 'Detalhes'];

function FormularioContent() {
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<CountryConfig | null>(null);

  const [step, setStep] = useState(1);
  const [inputMode, setInputMode] = useState<InputMode>('detalhado');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  // Form state
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [finalidade, setFinalidade] = useState<Finalidade | ''>('');
  const [prazo, setPrazo] = useState('');
  const [pagamento, setPagamento] = useState('');
  const [descricaoLivre, setDescricaoLivre] = useState('');
  const [tipoInteresse, setTipoInteresse] = useState('');
  const [bairros, setBairros] = useState('');
  const [orcamento, setOrcamento] = useState('');
  const [quartos, setQuartos] = useState('');
  const [vagas, setVagas] = useState('');
  const [area, setArea] = useState('');

  // Validation state — tracks which fields have been "touched" (blurred)
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const totalSteps = 3;

  // ---- Fetch Config ----
  useEffect(() => {
    async function fetchConfig() {
      const imobId = searchParams.get('imob_id');
      const imovelId = searchParams.get('imovel_id');
      
      let url = '/api/public/config';
      const params = new URLSearchParams();
      if (imobId) params.set('imob_id', imobId);
      if (imovelId) params.set('imovel_id', imovelId);
      
      if (params.toString()) url += `?${params.toString()}`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.config) {
          setConfig(getConfigByCode(data.config.config_pais));
        }
      } catch (err) {
        console.error('Falha ao carregar config:', err);
        // Fallback robusto
        setConfig(getConfigByCode('PT'));
      }
    }
    fetchConfig();
  }, [searchParams]);

  // ---- Phone mask ----
  function formatPhone(value: string): string {
    if (!config) return value;
    const digits = value.replace(/\D/g, '');
    
    if (config.code === 'PT') {
      // PT format: +351 9XX XXX XXX
      const ptDigits = digits.startsWith('351') ? digits.slice(3) : digits;
      if (ptDigits.length === 0) return '';
      if (ptDigits.length <= 3) return `+351 ${ptDigits}`;
      if (ptDigits.length <= 6) return `+351 ${ptDigits.slice(0, 3)} ${ptDigits.slice(3)}`;
      return `+351 ${ptDigits.slice(0, 3)} ${ptDigits.slice(3, 6)} ${ptDigits.slice(6, 9)}`;
    } else {
      // BR format: (00) 00000-0000
      const brDigits = digits.slice(0, 11);
      if (brDigits.length <= 2) return brDigits;
      if (brDigits.length <= 7) return `(${brDigits.slice(0, 2)}) ${brDigits.slice(2)}`;
      return `(${brDigits.slice(0, 2)}) ${brDigits.slice(2, 7)}-${brDigits.slice(7, 11)}`;
    }
  }

  // ---- Inline validation helpers ----
  function isPhoneValid(v: string): boolean {
    if (!config) return false;
    if (config.code === 'PT') {
      const d = v.replace(/\D/g, '');
      // Expect 351 + 9 digits = 12, or just 9 digits if user typed without +351
      return d.length === 12 || d.length === 9;
    } else {
      const d = v.replace(/\D/g, '');
      return d.length >= 10 && d.length <= 11;
    }
  }

  function isNomeValid(v: string): boolean {
    return v.trim().length >= 3;
  }

  const nomeError = touched.nome && !isNomeValid(nome) ? 'Nome deve ter pelo menos 3 caracteres' : '';
  const phoneError = touched.telefone && !isPhoneValid(telefone) ? (config?.code === 'PT' ? 'Informe um número de telefone válido (9 dígitos)' : 'Informe um número com DDD (10 ou 11 dígitos)') : '';

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  // ---- Navigation ----
  function goNext() {
    if (!isStepValid()) return;
    setDirection('forward');
    setStep((s) => Math.min(s + 1, totalSteps));
  }

  function goBack() {
    setDirection('backward');
    setStep((s) => Math.max(s - 1, 1));
  }

  const isStepValid = useCallback((): boolean => {
    if (step === 1) return isNomeValid(nome) && isPhoneValid(telefone);
    if (step === 2) return finalidade !== '';
    if (step === 3) {
      if (inputMode === 'livre') return descricaoLivre.trim().length >= 5;
      return tipoInteresse !== '';
    }
    return true;
  }, [step, nome, telefone, finalidade, inputMode, descricaoLivre, tipoInteresse]);

  // ---- Submit ----
  async function handleSubmit() {
    if (!isStepValid()) return;
    setIsSubmitting(true);

    const data: LeadFormData = {
      nome: nome.trim(),
      telefone: telefone.trim(),
      finalidade: finalidade as Finalidade,
      prazo: prazo || undefined,
      pagamento: pagamento || undefined,
      descricao_interesse: inputMode === 'livre' ? descricaoLivre : undefined,
      tipo_interesse: inputMode === 'detalhado' ? tipoInteresse : undefined,
      orcamento: orcamento ? parseFloat(orcamento) : undefined,
      area_interesse: area ? parseFloat(area) : undefined,
      quartos_interesse: quartos ? parseInt(quartos) : undefined,
      vagas_interesse: vagas ? parseInt(vagas) : undefined,
      bairros_interesse: bairros ? bairros.split(',').map((b) => b.trim()).filter(Boolean) : undefined,
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setIsSuccess(true);
      } else {
        alert('Erro ao enviar formulário. Tente novamente.');
      }
    } catch {
      alert('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ===========================
  // SUCCESS SCREEN
  // ===========================
  if (isSuccess) {
    const formattedPhone = telefone;
    return (
      <div className="min-h-screen bg-gradient-form flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-md w-full text-center animate-scale-in">
          {/* Animated check icon (CSS pure) */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-100 animate-[ping_1.5s_ease-in-out_1]" />
            <div className="relative w-24 h-24 rounded-full bg-emerald-50 border-4 border-emerald-500 flex items-center justify-center">
              <svg className="w-12 h-12 text-emerald-500 animate-[checkDraw_0.6s_ease-out_0.3s_both]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: 'checkDraw 0.6s ease-out 0.3s forwards' }} />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-text-primary mb-3">
            Pronto, {nome.split(' ')[0]}! 🎉
          </h2>
          <p className="text-text-secondary mb-4 leading-relaxed">
            Um corretor vai entrar em contato com você em breve pelo WhatsApp{' '}
            <strong className="text-text-primary">{formattedPhone}</strong>.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg py-2.5 px-4 mb-8">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tempo médio de resposta: menos de 10 minutos
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium transition-all duration-200 hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar ao início
          </Link>
        </div>

        {/* keyframes injected via style tag for simplicity */}
        <style>{`
          @keyframes checkDraw {
            to { stroke-dashoffset: 0; }
          }
        `}</style>
      </div>
    );
  }

  // Loading state
  if (!config) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const animationClass = direction === 'forward' ? 'animate-slide-right' : 'animate-slide-left';

  // ===========================
  // FORM
  // ===========================
  return (
    <div className="min-h-screen bg-gradient-form flex flex-col">
      {/* Header */}
      <header className="px-4 py-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-text-primary hover:text-primary transition-colors">
            <span className="text-xl">🏠</span>
            <span className="font-semibold">ImobIA</span>
          </Link>
        </div>
      </header>

      {/* ===== PROGRESS BAR: 3-segment stepper ===== */}
      <div className="max-w-lg mx-auto w-full px-4 mb-2">
        <div className="flex items-center gap-0">
          {stepLabels.map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = step === stepNum;
            const isCompleted = step > stepNum;
            return (
              <div key={label} className="flex-1 flex flex-col items-center">
                {/* Bar segment row */}
                <div className="w-full flex items-center">
                  {idx > 0 && (
                    <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${isCompleted || isActive ? 'bg-primary' : 'bg-slate-200'}`} />
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : isActive
                        ? 'bg-primary text-white shadow-md shadow-primary/30 ring-4 ring-primary/20'
                        : 'bg-slate-200 text-slate-500'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      stepNum
                    )}
                  </div>
                  {idx < stepLabels.length - 1 && (
                    <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step > stepNum ? 'bg-primary' : 'bg-slate-200'}`} />
                  )}
                </div>
                {/* Label */}
                <span className={`text-[11px] mt-1.5 font-medium transition-colors ${
                  isActive ? 'text-primary' : isCompleted ? 'text-primary/70' : 'text-slate-400'
                }`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-border-light p-6 md:p-8">

            {/* Step 1 — Dados pessoais */}
            {step === 1 && (
              <div key="step1" className={animationClass}>
                <h2 className="text-xl font-bold text-text-primary mb-1">Seus dados</h2>
                <p className="text-text-secondary text-sm mb-6">Como podemos entrar em contato?</p>

                <div className="space-y-4">
                  {/* Nome */}
                  <div>
                    <label htmlFor="nome" className="block text-sm font-medium text-text-primary mb-1.5">
                      Nome completo
                    </label>
                    <input
                      id="nome"
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      onBlur={() => handleBlur('nome')}
                      placeholder="Digite seu nome"
                      className={`w-full px-4 py-3 rounded-xl border bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all ${
                        nomeError
                          ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
                          : 'border-border focus:ring-primary/20 focus:border-primary'
                      }`}
                    />
                    {nomeError && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        {nomeError}
                      </p>
                    )}
                  </div>

                  {/* Telefone with mask */}
                  <div>
                    <label htmlFor="telefone" className="block text-sm font-medium text-text-primary mb-1.5">
                      WhatsApp
                    </label>
                    <div className="relative">
                      <input
                        id="telefone"
                        type="tel"
                        value={telefone}
                        onChange={(e) => setTelefone(formatPhone(e.target.value))}
                        onBlur={() => handleBlur('telefone')}
                        placeholder={config.phoneFormat.placeholder}
                        maxLength={config.code === 'PT' ? 16 : 15}
                        className={`w-full px-4 py-3 rounded-xl border bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all ${
                          phoneError
                            ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
                            : 'border-border focus:ring-primary/20 focus:border-primary'
                        }`}
                      />
                      {telefone && isPhoneValid(telefone) && !phoneError && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        </span>
                      )}
                    </div>
                    {phoneError && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        {phoneError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 — Perfil */}
            {step === 2 && (
              <div key="step2" className={animationClass}>
                <h2 className="text-xl font-bold text-text-primary mb-1">Seu perfil</h2>
                <p className="text-text-secondary text-sm mb-6">Conte-nos sobre o que você procura</p>

                <div className="space-y-5">
                  {/* Finalidade */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2.5">Finalidade</label>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { value: 'comprar', label: 'Comprar', icon: '🏡' },
                        { value: 'alugar', label: 'Alugar', icon: '🔑' },
                        { value: 'investir', label: 'Investir', icon: '📈' },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFinalidade(opt.value)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                            finalidade === opt.value
                              ? 'border-primary bg-primary-subtle text-primary shadow-sm'
                              : 'border-border hover:border-primary/30 text-text-secondary hover:bg-surface-hover'
                          }`}
                        >
                          <span className="text-2xl">{opt.icon}</span>
                          <span className="text-sm font-medium">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prazo (only if comprar) */}
                  {finalidade === 'comprar' && (
                    <div className="animate-fade-in">
                      <label htmlFor="prazo" className="block text-sm font-medium text-text-primary mb-1.5">
                        Prazo para mudar
                      </label>
                      <select
                        id="prazo"
                        value={prazo}
                        onChange={(e) => setPrazo(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      >
                        <option value="">Selecione...</option>
                        <option value="imediato">Imediato</option>
                        <option value="3-6 meses">3 a 6 meses</option>
                        <option value="6-12 meses">6 a 12 meses</option>
                        <option value="mais de 1 ano">Mais de 1 ano</option>
                      </select>
                    </div>
                  )}

                  {/* Pagamento */}
                  <div>
                    <label htmlFor="pagamento" className="block text-sm font-medium text-text-primary mb-1.5">
                      Forma de pagamento preferida
                    </label>
                    <select
                      id="pagamento"
                      value={pagamento}
                      onChange={(e) => setPagamento(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    >
                      <option value="">Selecione...</option>
                      <option value="financiamento">Financiamento bancário</option>
                      <option value="consorcio">Consórcio</option>
                      <option value="a_vista">À vista</option>
                      <option value="entrada_financiamento">Entrada + Financiamento</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 — Imóvel de interesse */}
            {step === 3 && (
              <div key="step3" className={animationClass}>
                <h2 className="text-xl font-bold text-text-primary mb-1">Imóvel de interesse</h2>
                <p className="text-text-secondary text-sm mb-6">Descreva o que procura</p>

                {/* Toggle mode */}
                <div className="flex rounded-xl bg-surface-alt p-1 mb-6">
                  <button
                    type="button"
                    onClick={() => setInputMode('detalhado')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                      inputMode === 'detalhado'
                        ? 'bg-white shadow-sm text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Busca detalhada
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('livre')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                      inputMode === 'livre'
                        ? 'bg-white shadow-sm text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Descrição livre
                  </button>
                </div>

                {inputMode === 'livre' ? (
                  <div className="animate-fade-in">
                    <textarea
                      value={descricaoLivre}
                      onChange={(e) => setDescricaoLivre(e.target.value)}
                      placeholder={`Ex: Procuro um apartamento de ${config.terminology.quartos(3).toLowerCase()} no Centro, com vaga de garagem, até ${config.currency.symbol} 500.000...`}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label htmlFor="tipo" className="block text-sm font-medium text-text-primary mb-1.5">Tipo de imóvel</label>
                      <select
                        id="tipo"
                        value={tipoInteresse}
                        onChange={(e) => setTipoInteresse(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      >
                        <option value="">Selecione...</option>
                        <option value="apartamento">Apartamento</option>
                        <option value="casa">Casa</option>
                        <option value="terreno">Terreno</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="bairros" className="block text-sm font-medium text-text-primary mb-1.5">Bairros de interesse</label>
                      <input
                        id="bairros"
                        type="text"
                        value={bairros}
                        onChange={(e) => setBairros(e.target.value)}
                        placeholder="Centro, Jardins, Vila Nova (separados por vírgula)"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="orcamento" className="block text-sm font-medium text-text-primary mb-1.5">Orçamento ({config.currency.symbol})</label>
                        <input id="orcamento" type="number" value={orcamento} onChange={(e) => setOrcamento(e.target.value)} placeholder="500000" className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                      </div>
                      <div>
                        <label htmlFor="area" className="block text-sm font-medium text-text-primary mb-1.5">Área (m²)</label>
                        <input id="area" type="number" value={area} onChange={(e) => setArea(e.target.value)} placeholder="80" className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="quartos" className="block text-sm font-medium text-text-primary mb-1.5">{config.terminology.quartosLabel}</label>
                        <select id="quartos" value={quartos} onChange={(e) => setQuartos(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                          <option value="">Qualquer</option>
                          {config.terminology.quartosOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="vagas" className="block text-sm font-medium text-text-primary mb-1.5">Vagas</label>
                        <select id="vagas" value={vagas} onChange={(e) => setVagas(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                          <option value="">Qualquer</option>
                          <option value="0">0</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3+</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-light">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-all font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Voltar
                </button>
              ) : (
                <div />
              )}

              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!isStepValid()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
                >
                  Próximo
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isStepValid() || isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-success hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 hover:shadow-lg hover:shadow-success/20"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function FormularioPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <FormularioContent />
    </Suspense>
  );
}
