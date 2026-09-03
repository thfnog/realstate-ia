'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LaudoCMAResult } from '@/lib/imoveis/cmaEngine';
import { CountryConfig, getConfigByCode, formatCurrency } from '@/lib/countryConfig';
import { 
  IoArrowBack, 
  IoPrintOutline, 
  IoLogoWhatsapp, 
  IoRefreshOutline, 
  IoTrendingUpOutline, 
  IoShieldCheckmarkOutline,
  IoCheckmarkCircle,
  IoAlertCircleOutline,
  IoSparkles,
  IoBusinessOutline,
  IoTimeOutline,
  IoHomeOutline,
  IoRibbonOutline,
} from 'react-icons/io5';

export default function LaudoAvaliacaoPage() {
  const params = useParams();
  const router = useRouter();
  const [laudo, setLaudo] = useState<LaudoCMAResult | null>(null);
  const [config, setConfig] = useState<CountryConfig>(getConfigByCode('BR'));
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchLaudo(isRecalc = false) {
    if (isRecalc) setRecalculating(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/imoveis/${params.id}/laudo-avaliacao`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao carregar laudo de avaliação');
      }
      const data: LaudoCMAResult = await res.json();
      setLaudo(data);
      setConfig(getConfigByCode(data.imovel.pais || 'BR'));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro inesperado ao gerar laudo.');
    } finally {
      setLoading(false);
      setRecalculating(false);
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchLaudo();
    }
  }, [params.id]);

  function handlePrint() {
    window.print();
  }

  function handleShareWhatsApp() {
    if (!laudo) return;
    const { imovel, faixasPreco, estatisticas, imobiliaria, corretor } = laudo;
    const nomeProprietario = imovel.proprietario_nome ? `Olá, ${imovel.proprietario_nome}!` : 'Olá!';
    const corretorNome = corretor?.nome || 'Consultor ImobIA';
    const moeda = imovel.pais === 'PT' ? '€' : 'R$';

    const texto = `${nomeProprietario}\n\n` +
      `Aqui é o *${corretorNome}* da *${imobiliaria.nome}*.\n` +
      `Concluí o *Laudo Técnico de Análise Comparativa de Mercado (CMA)* do seu imóvel localizado em *${imovel.freguesia}, ${imovel.concelho}*.\n\n` +
      `📊 *RESUMO EXECUTIVO DO ESTUDO:*\n` +
      `• Área Útil: *${imovel.area_util}m²* (${imovel.quartos || '—'} dorms | ${imovel.vagas_garagem} vagas)\n` +
      `• Mediana do Bairro: *${formatCurrency(estatisticas.precoMedianoM2Bairro, config)}/m²*\n` +
      `• Tendência de Valorização: *+${estatisticas.valorizacaoAnualRegiao}% ao ano*\n\n` +
      `🎯 *FAIXAS DE PRECIFICAÇÃO RECOMENDADAS:*\n` +
      `🟢 *Preço de Mercado Ideal (60 a 90 dias):* ${formatCurrency(faixasPreco.ideal.precoTotal, config)} (${formatCurrency(faixasPreco.ideal.precoM2, config)}/m²)\n` +
      `⚡ *Venda Ágil (30 a 45 dias):* ${formatCurrency(faixasPreco.oportunidade.precoTotal, config)}\n` +
      `⚠️ *Teto de Mercado / Risco (>180 dias):* ${formatCurrency(faixasPreco.teto.precoTotal, config)}\n\n` +
      `💡 *Estratégia:* Trabalhar com precificação calibrada e captação exclusiva garante investimento integral da nossa equipe em marketing premium, tour 360° e rápida liquidação pelo maior valor líquido.\n\n` +
      `Podemos conversar hoje para definirmos o plano de lançamento?`;

    const encoded = encodeURIComponent(texto);
    const phone = imovel.proprietario_telefone ? imovel.proprietario_telefone.replace(/\D/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 space-y-8 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-2xl w-1/3"></div>
        <div className="bg-white p-8 rounded-3xl border border-border-light shadow-sm space-y-6">
          <div className="h-12 bg-slate-200 rounded-xl w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="grid grid-cols-3 gap-6 pt-4">
            <div className="h-32 bg-slate-100 rounded-2xl"></div>
            <div className="h-32 bg-slate-100 rounded-2xl"></div>
            <div className="h-32 bg-slate-100 rounded-2xl"></div>
          </div>
          <div className="h-48 bg-slate-100 rounded-2xl"></div>
        </div>
        <div className="text-center text-text-secondary text-sm font-semibold flex items-center justify-center gap-2">
          <IoSparkles className="animate-spin text-primary" /> Processando Inteligência de Mercado & Amostragem com IA...
        </div>
      </div>
    );
  }

  if (error || !laudo) {
    return (
      <div className="max-w-2xl mx-auto my-20 p-8 bg-white rounded-3xl border border-border-light text-center space-y-4 shadow-xl">
        <IoAlertCircleOutline className="text-rose-500 text-5xl mx-auto" />
        <h2 className="text-xl font-bold text-text-primary">Não foi possível gerar o Laudo</h2>
        <p className="text-text-secondary text-sm">{error || 'Dados insuficientes para gerar a análise comparativa de mercado.'}</p>
        <div className="pt-4 flex justify-center gap-3">
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl bg-surface-alt hover:bg-surface-hover font-semibold text-sm"
          >
            Voltar
          </button>
          <button
            onClick={() => fetchLaudo()}
            className="px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-hover font-semibold text-sm"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const { imovel, imobiliaria, corretor, estatisticas, comparaveis, faixasPreco, locacao, parecerIA } = laudo;
  const precoM2Imovel = estatisticas.precoM2Imovel;
  const maxM2Ref = Math.max(precoM2Imovel, estatisticas.precoMedianoM2Bairro, estatisticas.precoMedianoM2Cidade, faixasPreco.teto.precoM2) * 1.15;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-24 text-slate-800">
      {/* Printable styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm 15mm;
          }
          nav, aside, footer, .no-print, button, a[href^="/admin"] {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            padding: 0 !important;
            margin: 0 !important;
            font-size: 11pt !important;
          }
          .laudo-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .page-break-before {
            page-break-before: always;
            break-before: page;
          }
          .avoid-page-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xl {
            box-shadow: none !important;
          }
          .card-border-print {
            border: 1px solid #cbd5e1 !important;
          }
          .badge-print {
            border: 1px solid #94a3b8 !important;
          }
        }
      `}</style>

      {/* Floating / Sticky Action Toolbar (NO-PRINT) */}
      <div className="no-print sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-border-light px-4 py-3 shadow-sm mb-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/imoveis/${imovel.id}`}
              className="p-2 rounded-xl hover:bg-surface-alt text-text-secondary transition-all flex items-center gap-1.5 text-xs font-bold"
            >
              <IoArrowBack size={16} /> Voltar ao Imóvel
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                Laudo CMA
              </span>
              <span className="text-xs font-bold text-text-primary truncate max-w-[200px] md:max-w-xs">
                {imovel.titulo}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchLaudo(true)}
              disabled={recalculating}
              className="px-3.5 py-2 rounded-xl bg-surface-alt hover:bg-surface-hover text-text-primary text-xs font-bold transition-all border border-border-light flex items-center gap-1.5"
              title="Regerar análise com IA"
            >
              <IoRefreshOutline className={recalculating ? 'animate-spin text-primary' : ''} size={15} />
              {recalculating ? 'Atualizando...' : 'Recalcular'}
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 flex items-center gap-1.5"
            >
              <IoLogoWhatsapp size={15} /> WhatsApp do Proprietário
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <IoPrintOutline size={15} /> Imprimir / Salvar PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Dossier Container */}
      <main className="laudo-container max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        
        {/* =========================================================
            HEADER CORPORATIVO / CAPA DO LAUDO
           ========================================================= */}
        <div className="bg-white rounded-3xl border border-border-light p-6 sm:p-8 shadow-sm card-border-print">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-border-light">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xl shadow-md shadow-primary/20">
                🏢
              </div>
              <div>
                <h2 className="text-base font-black text-text-primary uppercase tracking-tight">
                  {imobiliaria.nome}
                </h2>
                <p className="text-xs text-text-secondary font-medium">
                  {imobiliaria.numero_registro ? `${imobiliaria.numero_registro} • ` : ''}
                  {imobiliaria.identificador_fiscal || 'Inteligência Imobiliária'}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs space-y-0.5">
              <p className="text-text-secondary font-bold uppercase tracking-wider text-[10px]">Data de Emissão</p>
              <p className="font-bold text-text-primary text-sm">{laudo.dataEmissao}</p>
              <p className="text-[10px] text-text-secondary">Validade técnica: 30 dias ({laudo.dataValidade})</p>
            </div>
          </div>

          <div className="pt-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 mb-2">
                <IoRibbonOutline size={12} /> Parecer Técnico de Avaliação Mercadológica (CMA)
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
                Estudo de Posicionamento & Precificação
              </h1>
              <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                <span>📍</span> {imovel.enderecoCompleto}
              </p>
            </div>

            {corretor && (
              <div className="bg-surface-alt/50 px-4 py-3 rounded-2xl border border-border-light/80 text-xs min-w-[220px]">
                <p className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Consultor Responsável</p>
                <p className="font-bold text-text-primary text-sm">{corretor.nome}</p>
                <p className="text-text-secondary text-[11px]">{corretor.telefone} {corretor.email ? `• ${corretor.email}` : ''}</p>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================
            1. DADOS DO IMÓVEL & FICHA TÉCNICA
           ========================================================= */}
        <div className="bg-white rounded-3xl border border-border-light p-6 sm:p-8 shadow-sm card-border-print space-y-6 avoid-page-break">
          <div className="flex items-center justify-between border-b border-border-light pb-4">
            <h2 className="text-base font-black text-text-primary uppercase tracking-tight flex items-center gap-2">
              <span>🏠</span> 1. Ficha Técnica do Imóvel Avaliado
            </h2>
            <span className="text-xs font-bold text-primary bg-primary/5 px-3 py-1 rounded-lg border border-primary/10">
              Ref: {imovel.referencia}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Foto Principal */}
            <div className="md:col-span-1 rounded-2xl overflow-hidden bg-slate-100 aspect-4/3 relative border border-border-light flex items-center justify-center">
              {imovel.fotoPrincipal ? (
                <img
                  src={imovel.fotoPrincipal}
                  alt={imovel.titulo}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-6 text-slate-400">
                  <IoHomeOutline size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold">Foto não informada</p>
                </div>
              )}
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                {imovel.tipo.toUpperCase()}
              </div>
            </div>

            {/* Grid de Atributos */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-surface-alt/40 p-3.5 rounded-2xl border border-border-light text-center">
                  <p className="text-[10px] font-bold uppercase text-text-secondary">Área Útil</p>
                  <p className="text-lg font-black text-text-primary">{imovel.area_util || '—'} m²</p>
                </div>
                <div className="bg-surface-alt/40 p-3.5 rounded-2xl border border-border-light text-center">
                  <p className="text-[10px] font-bold uppercase text-text-secondary">{config.terminology.quartosLabel}</p>
                  <p className="text-lg font-black text-text-primary">{imovel.quartos || '—'}</p>
                </div>
                <div className="bg-surface-alt/40 p-3.5 rounded-2xl border border-border-light text-center">
                  <p className="text-[10px] font-bold uppercase text-text-secondary">Suítes</p>
                  <p className="text-lg font-black text-text-primary">{imovel.suites || '0'}</p>
                </div>
                <div className="bg-surface-alt/40 p-3.5 rounded-2xl border border-border-light text-center">
                  <p className="text-[10px] font-bold uppercase text-text-secondary">Vagas Garagem</p>
                  <p className="text-lg font-black text-text-primary">{imovel.vagas_garagem ?? '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-surface-alt/30 p-3 rounded-xl border border-border-light flex justify-between items-center text-xs">
                  <span className="text-text-secondary">Condomínio:</span>
                  <span className="font-bold text-text-primary">{formatCurrency(imovel.condominio_mensal, config)}/mês</span>
                </div>
                <div className="bg-surface-alt/30 p-3 rounded-xl border border-border-light flex justify-between items-center text-xs">
                  <span className="text-text-secondary">{config.code === 'BR' ? 'IPTU Anual:' : 'IMI Anual:'}</span>
                  <span className="font-bold text-text-primary">{formatCurrency(imovel.imi_iptu_anual, config)}</span>
                </div>
                <div className="bg-surface-alt/30 p-3 rounded-xl border border-border-light flex justify-between items-center text-xs">
                  <span className="text-text-secondary">Preço Pretendido:</span>
                  <span className="font-bold text-primary">{formatCurrency(imovel.valorAtual, config)}</span>
                </div>
              </div>

              {/* Comodidades */}
              {imovel.comodidades && imovel.comodidades.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-bold uppercase text-text-secondary mb-1.5 tracking-wider">Diferenciais e Acabamentos:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {imovel.comodidades.map((c, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-surface-alt text-text-primary text-[11px] font-medium border border-border-light">
                        ✨ {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================
            2. TERMÔMETRO & POSICIONAMENTO DE MERCADO
           ========================================================= */}
        <div className="bg-white rounded-3xl border border-border-light p-6 sm:p-8 shadow-sm card-border-print space-y-6 avoid-page-break">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-border-light pb-4">
            <div>
              <h2 className="text-base font-black text-text-primary uppercase tracking-tight flex items-center gap-2">
                <span>📊</span> 2. Termômetro de Mercado & Comparativo por Metro Quadrado
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Comparação direta do valor do m² deste imóvel frente às médias consolidadas da região.
              </p>
            </div>
            <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              estatisticas.posicionamento === 'abaixo' ? 'bg-sky-50 text-sky-700 border-sky-200' :
              estatisticas.posicionamento === 'competitivo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              estatisticas.posicionamento === 'ligeiramente_acima' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {estatisticas.badgeLabel}
            </span>
          </div>

          {/* Comparativo em Barras Visuais */}
          <div className="space-y-4 bg-surface-alt/30 p-5 rounded-2xl border border-border-light">
            {/* Barra 1: Este Imóvel */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-text-primary flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
                  Este Imóvel (Preço Pretendido)
                </span>
                <span className="text-primary text-sm font-black">
                  {formatCurrency(precoM2Imovel, config)}/m²
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-700" 
                  style={{ width: `${Math.min((precoM2Imovel / maxM2Ref) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Barra 2: Média do Bairro */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-text-secondary flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  Mediana no Bairro ({imovel.freguesia || imovel.concelho})
                </span>
                <span className="text-emerald-700 text-sm font-black">
                  {formatCurrency(estatisticas.precoMedianoM2Bairro, config)}/m²
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700" 
                  style={{ width: `${Math.min((estatisticas.precoMedianoM2Bairro / maxM2Ref) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Barra 3: Média da Cidade */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-text-secondary flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                  Mediana Geral da Cidade ({imovel.concelho})
                </span>
                <span className="text-slate-700 text-sm font-black">
                  {formatCurrency(estatisticas.precoMedianoM2Cidade, config)}/m²
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-400 rounded-full transition-all duration-700" 
                  style={{ width: `${Math.min((estatisticas.precoMedianoM2Cidade / maxM2Ref) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Destaque de Variação e Valorização */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-border-light flex items-center gap-3">
              <div className={`p-3 rounded-xl text-lg ${
                estatisticas.variacaoVsMercadoPct <= 5 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                <IoTrendingUpOutline />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-text-secondary">Variação vs Mediana do Bairro</p>
                <p className={`text-lg font-black ${
                  estatisticas.variacaoVsMercadoPct <= 5 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {estatisticas.variacaoVsMercadoPct > 0 ? '+' : ''}{estatisticas.variacaoVsMercadoPct}%
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-border-light flex items-center gap-3">
              <div className="p-3 rounded-xl text-lg bg-indigo-50 text-indigo-600">
                <IoShieldCheckmarkOutline />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-text-secondary">Valorização Anual na Região</p>
                <p className="text-lg font-black text-indigo-700">
                  +{estatisticas.valorizacaoAnualRegiao}% ao ano
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            3. AMOSTRAGEM COMPARATIVA (IMÓVEIS CONCORRENTES)
           ========================================================= */}
        <div className="bg-white rounded-3xl border border-border-light p-6 sm:p-8 shadow-sm card-border-print space-y-6 avoid-page-break">
          <div className="border-b border-border-light pb-4">
            <h2 className="text-base font-black text-text-primary uppercase tracking-tight flex items-center gap-2">
              <span>🏘️</span> 3. Imóveis Concorrentes na Mesma Região (Amostragem de Mercado)
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Imóveis de mesma tipologia e padrão similar ativos na região que concorrem diretamente pela atenção do mesmo comprador.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparaveis.map((comp, idx) => (
              <div
                key={comp.id || idx}
                className="bg-surface-alt/30 rounded-2xl border border-border-light p-4 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                      {comp.referencia}
                    </span>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {comp.similaridade}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-text-primary line-clamp-2 mb-1">
                    {comp.titulo}
                  </h4>
                  <p className="text-[11px] text-text-secondary">
                    📍 {comp.bairro}, {comp.cidade}
                  </p>
                </div>

                <div className="pt-3 border-t border-border-light/80 space-y-2">
                  <div className="flex justify-between text-[11px] text-text-secondary">
                    <span>📐 {comp.area_util}m²</span>
                    <span>🛏️ {comp.quartos || '—'} qts</span>
                    <span>🚗 {comp.vagas || '—'} vag</span>
                  </div>
                  <div className="flex justify-between items-end bg-white p-2.5 rounded-xl border border-border-light">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-text-secondary">Valor Total</p>
                      <p className="text-xs font-black text-text-primary">{formatCurrency(comp.valor, config)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase font-bold text-text-secondary">Preço/m²</p>
                      <p className="text-xs font-black text-primary">{formatCurrency(comp.precoM2, config)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-text-secondary italic text-center">
            * Amostragem consolidada de ofertas ativas e histórico recente de transações no bairro.
          </p>
        </div>

        {/* =========================================================
            4. RECOMENDAÇÃO DE FAIXA DE PREÇO & LIQUIDEZ
           ========================================================= */}
        <div className="bg-white rounded-3xl border border-border-light p-6 sm:p-8 shadow-sm card-border-print space-y-6 avoid-page-break page-break-before">
          <div className="border-b border-border-light pb-4">
            <h2 className="text-base font-black text-text-primary uppercase tracking-tight flex items-center gap-2">
              <span>🎯</span> 4. Matriz de Precificação Recomendada & Cenários de Liquidez
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Cenários estratégicos de posicionamento calculados com base na curva de absorção de compradores.
            </p>
          </div>

          {/* 3 Colunas de Precificação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Oportunidade / Venda Ágil */}
            <div className="rounded-3xl border-2 border-sky-200 bg-sky-50/40 p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-sky-100 text-sky-800">
                    ⚡ {faixasPreco.oportunidade.destaque}
                  </span>
                  <span className="text-[10px] font-bold text-sky-700 flex items-center gap-1">
                    <IoTimeOutline /> {faixasPreco.oportunidade.prazoEstimado}
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-800">
                  {faixasPreco.oportunidade.titulo}
                </h3>
                <div className="mt-3">
                  <p className="text-2xl font-black text-sky-700">
                    {formatCurrency(faixasPreco.oportunidade.precoTotal, config)}
                  </p>
                  <p className="text-xs font-bold text-sky-600 mt-0.5">
                    {formatCurrency(faixasPreco.oportunidade.precoM2, config)}/m²
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed border-t border-sky-200/60 pt-3">
                {faixasPreco.oportunidade.descricao}
              </p>
            </div>

            {/* 2. Preço de Mercado Ideal (Recomendado) */}
            <div className="rounded-3xl border-2 border-emerald-500 bg-emerald-50/60 p-5 flex flex-col justify-between space-y-4 shadow-lg shadow-emerald-500/10 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full shadow-sm">
                ⭐ RECOMENDADO IMOBIA
              </div>
              <div>
                <div className="flex justify-between items-center mb-2 pt-1">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    🎯 Valor Justo
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                    <IoTimeOutline /> {faixasPreco.ideal.prazoEstimado}
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  {faixasPreco.ideal.titulo}
                </h3>
                <div className="mt-3">
                  <p className="text-2xl font-black text-emerald-700">
                    {formatCurrency(faixasPreco.ideal.precoTotal, config)}
                  </p>
                  <p className="text-xs font-bold text-emerald-600 mt-0.5">
                    {formatCurrency(faixasPreco.ideal.precoM2, config)}/m²
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed border-t border-emerald-200 pt-3 font-medium">
                {faixasPreco.ideal.descricao}
              </p>
            </div>

            {/* 3. Preço Teto / Risco */}
            <div className="rounded-3xl border-2 border-rose-200 bg-rose-50/30 p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
                    ⚠️ {faixasPreco.teto.destaque}
                  </span>
                  <span className="text-[10px] font-bold text-rose-700 flex items-center gap-1">
                    <IoTimeOutline /> {faixasPreco.teto.prazoEstimado}
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-800">
                  {faixasPreco.teto.titulo}
                </h3>
                <div className="mt-3">
                  <p className="text-2xl font-black text-rose-700">
                    {formatCurrency(faixasPreco.teto.precoTotal, config)}
                  </p>
                  <p className="text-xs font-bold text-rose-600 mt-0.5">
                    {formatCurrency(faixasPreco.teto.precoM2, config)}/m²
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed border-t border-rose-200/60 pt-3">
                {faixasPreco.teto.descricao}
              </p>
            </div>
          </div>

          {/* Estimativa de Rentabilidade de Locação (Rental Yield) */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary-light">
                Rentabilidade Imobiliária (Rental Yield)
              </span>
              <h4 className="text-base font-bold">Estimativa para Arrendamento / Locação Mensal</h4>
              <p className="text-xs text-slate-400">{locacao.observacao}</p>
            </div>

            <div className="flex gap-6 sm:text-right">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Aluguel Estimado</p>
                <p className="text-xl font-black text-emerald-400">{formatCurrency(locacao.valorMensalEstimado, config)}<span className="text-xs font-normal">/mês</span></p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Yield Anual Projetado</p>
                <p className="text-xl font-black text-primary-light">{locacao.rentalYieldAnualPct}% a.a.</p>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            5. PARECER CONSULTIVO DA IA (DIRECIONADO AO PROPRIETÁRIO)
           ========================================================= */}
        <div className="bg-white rounded-3xl border border-border-light p-6 sm:p-8 shadow-sm card-border-print space-y-6 avoid-page-break">
          <div className="border-b border-border-light pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-text-primary uppercase tracking-tight flex items-center gap-2">
                <span>🤖</span> 5. Parecer Técnico Consultivo ImobIA
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Diagnóstico executivo de posicionamento e estratégia para fechamento de captação exclusiva.
              </p>
            </div>
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <IoSparkles /> IA & Engenharia de Dados
            </span>
          </div>

          <div className="space-y-6 text-sm">
            {/* Resumo Executivo */}
            <div className="bg-surface-alt/40 p-5 rounded-2xl border border-border-light space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <span>📌</span> Resumo Executivo & Diagnóstico
              </h3>
              <p className="text-slate-700 leading-relaxed">
                {parecerIA.resumo_executivo}
              </p>
            </div>

            {/* Pontos Fortes do Imóvel */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <span>✨</span> Principais Diferenciais e Pontos Fortes do Imóvel
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {parecerIA.pontos_fortes.map((ponto, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-white p-3.5 rounded-xl border border-border-light">
                    <IoCheckmarkCircle className="text-emerald-500 text-lg shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700 leading-snug">{ponto}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerta de Sobrepreço */}
            <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-2xl space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <span>⚠️</span> Alerta Técnico: Os Riscos da Sobreprecificação
              </h3>
              <p className="text-xs text-amber-950/80 leading-relaxed">
                {parecerIA.alerta_sobrepreco}
              </p>
            </div>

            {/* Estratégia Recomendada & Exclusividade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-alt/30 p-5 rounded-2xl border border-border-light space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <span>🚀</span> Estratégia Comercial Recomendada
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {parecerIA.estrategia_recomendada}
                </p>
              </div>

              <div className="bg-indigo-50/60 p-5 rounded-2xl border border-indigo-100 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-2">
                  <span>🤝</span> Por Que Trabalhar com Contrato de Exclusividade?
                </h3>
                <p className="text-xs text-indigo-950/80 leading-relaxed">
                  {parecerIA.argumento_exclusividade}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            6. ASSINATURA & RESPONSABILIDADE TÉCNICA
           ========================================================= */}
        <div className="bg-white rounded-3xl border border-border-light p-6 sm:p-8 shadow-sm card-border-print space-y-8 avoid-page-break">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary">
              Declaração de Responsabilidade Técnica
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Este Laudo de Avaliação de Mercado (CMA) foi elaborado com base nas normas mercadológicas e técnicas de amostragem comparativa direta, cruzando dados oficiais de mercado (FipeZAP/INE) e a oferta concorrente no mesmo raio territorial.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 pt-8 border-t border-border-light max-w-2xl mx-auto">
            <div className="text-center space-y-1">
              <div className="h-12 border-b border-slate-300 w-4/5 mx-auto mb-2 flex items-end justify-center pb-1">
                <span className="text-xs font-serif italic text-slate-400">Assinatura Digital</span>
              </div>
              <p className="text-xs font-bold text-text-primary">{corretor?.nome || 'Consultor Responsável'}</p>
              <p className="text-[10px] text-text-secondary">
                {corretor?.telefone} {imobiliaria.numero_registro ? `• ${imobiliaria.numero_registro}` : ''}
              </p>
            </div>

            <div className="text-center space-y-1">
              <div className="h-12 border-b border-slate-300 w-4/5 mx-auto mb-2 flex items-end justify-center pb-1">
                <span className="text-xs font-serif italic text-slate-400">Diretoria Técnica</span>
              </div>
              <p className="text-xs font-bold text-text-primary">{imobiliaria.nome}</p>
              <p className="text-[10px] text-text-secondary">
                {imobiliaria.identificador_fiscal || 'Imobiliária Credenciada'}
              </p>
            </div>
          </div>

          <div className="pt-4 text-center">
            <p className="text-[9px] text-slate-400">
              ImobIA Plataforma de Inteligência Imobiliária © {new Date().getFullYear()} • Documento gerado em {laudo.dataEmissao}
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
