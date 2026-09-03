import { NextResponse } from 'next/server';
import { getUserSupabaseClient, supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getAuthFromCookies } from '@/lib/auth';
import { getImovelRepository, getCorretorRepository } from '@/lib/repositories/factory';
import { isMockMode, getImobiliariaById, DEFAULT_IMOBILIARIA_ID } from '@/lib/mockDb';
import { gerarLaudoCMACompleto, LaudoCMAResult } from '@/lib/imoveis/cmaEngine';
import { Imobiliaria, Corretor } from '@/lib/database.types';
import { getConfigByCode, formatCurrency } from '@/lib/countryConfig';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'html';

    // 1. Obter sessão ou token
    const session = await getAuthFromCookies();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    
    // Suporte tanto para usuário logado quanto acesso por token seguro ou consulta direta
    const imobiliariaId = session?.imobiliaria_id || searchParams.get('imobiliaria_id') || DEFAULT_IMOBILIARIA_ID;
    const client = session?.app_role === 'admin' || session?.app_role === 'master' 
      ? supabaseAdmin 
      : (token ? getUserSupabaseClient(token) : supabaseAdmin);

    const imovelRepo = getImovelRepository(client);
    const corretorRepo = getCorretorRepository(client);

    // 2. Buscar imóvel
    const imovel = await imovelRepo.findById(id, imobiliariaId);
    if (!imovel) {
      return new Response(
        `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Imóvel não encontrado</title><style>body{font-family:sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b;}</style></head><body><h1>Imóvel não encontrado</h1><p>Não foi possível localizar o imóvel solicitado para geração do laudo.</p></body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // 3. Buscar comparáveis
    const { data: todosImoveis } = await imovelRepo.findAll({
      imobiliaria_id: imovel.imobiliaria_id || imobiliariaId,
      limit: 100,
    });

    // 4. Buscar dados da Imobiliária
    let imobiliaria: Imobiliaria;
    if (isMockMode()) {
      imobiliaria = getImobiliariaById(imovel.imobiliaria_id) || getImobiliariaById(DEFAULT_IMOBILIARIA_ID) || {
        id: imovel.imobiliaria_id || DEFAULT_IMOBILIARIA_ID,
        nome_fantasia: 'Imobiliária ImobIA',
        identificador_fiscal: imovel.pais === 'PT' ? 'NIF 500 123 456' : 'CNPJ 12.345.678/0001-90',
        numero_registro: imovel.pais === 'PT' ? 'AMI 12345' : 'CRECI 45678-J',
        plano: 'profissional',
        config_pais: imovel.pais || 'BR',
        delay_auto_reply_sec: 20,
        config_lembrete_1_horas: 24,
        config_lembrete_2_horas: 2,
        criado_em: new Date().toISOString(),
      };
    } else {
      const { data: imobData } = await supabaseAdmin
        .from('imobiliarias')
        .select('*')
        .eq('id', imovel.imobiliaria_id)
        .single();

      if (!imobData) {
        imobiliaria = {
          id: imovel.imobiliaria_id,
          nome_fantasia: 'Imobiliária ImobIA',
          identificador_fiscal: imovel.pais === 'PT' ? 'NIF 500 123 456' : 'CNPJ 12.345.678/0001-90',
          numero_registro: imovel.pais === 'PT' ? 'AMI 12345' : 'CRECI 45678-J',
          plano: 'profissional',
          config_pais: imovel.pais || 'BR',
          delay_auto_reply_sec: 20,
          config_lembrete_1_horas: 24,
          config_lembrete_2_horas: 2,
          criado_em: new Date().toISOString(),
        };
      } else {
        imobiliaria = imobData;
      }
    }

    // 5. Buscar corretor responsável
    let corretor: Corretor | null = null;
    const corretorId = imovel.corretor_id || session?.corretor_id;
    if (corretorId) {
      try {
        corretor = await corretorRepo.findById(corretorId, imobiliaria.id);
      } catch {
        corretor = null;
      }
    }

    // 6. Gerar Laudo CMA
    const laudo = await gerarLaudoCMACompleto({
      imovel,
      todosImoveis,
      imobiliaria,
      corretor,
    });

    if (format === 'json') {
      return NextResponse.json(laudo);
    }

    // 7. Compilar HTML Standalone Imprimível
    const html = renderLaudoHTML(laudo);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('SERVER ERROR GET LAUDO AVALIACAO PDF:', error);
    return new Response(
      `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Erro no Laudo</title></head><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Erro ao gerar Laudo de Avaliação</h2><p>${error.message || 'Erro inesperado'}</p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

function renderLaudoHTML(laudo: LaudoCMAResult): string {
  const { imovel, imobiliaria, corretor, estatisticas, comparaveis, faixasPreco, locacao, parecerIA } = laudo;
  const config = getConfigByCode(imovel.pais || 'BR');
  const precoM2Imovel = estatisticas.precoM2Imovel;
  const maxM2Ref = Math.max(precoM2Imovel, estatisticas.precoMedianoM2Bairro, estatisticas.precoMedianoM2Cidade, faixasPreco.teto.precoM2) * 1.15;

  const safeParecer = parecerIA || {
    resumo_executivo: 'Diagnóstico executivo de posicionamento e liquidez de mercado.',
    pontos_fortes: [
      'Excelente distribuição de planta e aproveitamento de áreas úteis',
      'Localização privilegiada com infraestrutura consolidada',
      'Potencial consistente de valorização patrimonial na região'
    ],
    diagnostico_mercado: 'Mercado com demanda ativa para imóveis bem posicionados na região.',
    analise_concorrencia: 'Imóveis concorrentes apresentam variação média de preço por m².',
    alerta_sobrepreco: 'Precificar dentro da faixa recomendada assegura tração imediata nos primeiros 30 dias de lançamento.',
    estrategia_recomendada: 'Recomendamos iniciar a comercialização na faixa de mercado ideal com plano de marketing digital completo.',
    argumento_exclusividade: 'Com a captação exclusiva, nossa equipe direciona investimento dedicado em mídia, qualificação prévia e acompanhamento contínuo.'
  };

  const pctImovel = Math.min((precoM2Imovel / maxM2Ref) * 100, 100).toFixed(1);
  const pctBairro = Math.min((estatisticas.precoMedianoM2Bairro / maxM2Ref) * 100, 100).toFixed(1);
  const pctCidade = Math.min((estatisticas.precoMedianoM2Cidade / maxM2Ref) * 100, 100).toFixed(1);

  const phoneProp = imovel.proprietario_telefone ? imovel.proprietario_telefone.replace(/\D/g, '') : '';
  const corretorNome = corretor?.nome || 'Consultor Especialista';

  // Mensagem para o WhatsApp do Proprietário
  const whatsAppMessage = encodeURIComponent(
    `Olá, ${imovel.proprietario_nome || 'Prezado(a) Proprietário(a)'}!\n\n` +
    `Aqui é o *${corretorNome}* da *${imobiliaria.nome}*.\n` +
    `Concluí o *Laudo Técnico de Análise Comparativa de Mercado (CMA)* do seu imóvel em *${imovel.freguesia}, ${imovel.concelho}*.\n\n` +
    `📊 *RESUMO EXECUTIVO DO ESTUDO:*\n` +
    `• Área Útil: *${imovel.area_util}m²* (${imovel.quartos || '—'} dorms | ${imovel.vagas_garagem} vagas)\n` +
    `• Mediana do Bairro: *${formatCurrency(estatisticas.precoMedianoM2Bairro, config)}/m²*\n` +
    `• Valorização Anual da Região: *+${estatisticas.valorizacaoAnualRegiao}% ao ano*\n\n` +
    `🎯 *FAIXAS DE PRECIFICAÇÃO RECOMENDADAS:*\n` +
    `🟢 *Preço de Mercado Ideal (60 a 90 dias):* ${formatCurrency(faixasPreco.ideal.precoTotal, config)} (${formatCurrency(faixasPreco.ideal.precoM2, config)}/m²)\n` +
    `⚡ *Venda Ágil (30 a 45 dias):* ${formatCurrency(faixasPreco.oportunidade.precoTotal, config)}\n` +
    `⚠️ *Teto de Mercado / Risco (>180 dias):* ${formatCurrency(faixasPreco.teto.precoTotal, config)}\n\n` +
    `💡 *Estratégia:* Trabalhar no preço justo com captação exclusiva garante investimento prioritário da nossa equipe em marketing digital, tour virtual e fechamento mais rápido pelo melhor valor líquido.\n\n` +
    `Acesse o documento completo de avaliação no link abaixo:\n`
  );

  const whatsappUrl = phoneProp
    ? `https://wa.me/55${phoneProp}?text=${whatsAppMessage}`
    : `https://wa.me/?text=${whatsAppMessage}`;

  return `<!DOCTYPE html>
<html lang="${imovel.pais === 'PT' ? 'pt-PT' : 'pt-BR'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laudo de Avaliação CMA - ${imovel.referencia} - ${imovel.titulo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #2563eb;
      --primary-dark: #1d4ed8;
      --primary-light: #eff6ff;
      --slate-900: #0f172a;
      --slate-800: #1e293b;
      --slate-700: #334155;
      --slate-600: #475569;
      --slate-500: #64748b;
      --slate-400: #94a3b8;
      --slate-200: #e2e8f0;
      --slate-100: #f1f5f9;
      --slate-50: #f8fafc;
      --emerald-600: #059669;
      --emerald-500: #10b981;
      --emerald-50: #ecfdf5;
      --emerald-100: #d1fae5;
      --sky-600: #0284c7;
      --sky-50: #f0f9ff;
      --sky-100: #e0f2fe;
      --rose-600: #e11d48;
      --rose-50: #fff1f2;
      --rose-100: #ffe4e6;
      --amber-600: #d97706;
      --amber-50: #fffbeb;
      --amber-100: #fef3c7;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background-color: #f1f5f9;
      color: var(--slate-800);
      line-height: 1.5;
      padding-bottom: 60px;
    }

    /* Floating Header Action Bar */
    .action-toolbar {
      position: sticky;
      top: 0;
      z-index: 999;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--slate-200);
      padding: 12px 24px;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .toolbar-title {
      font-size: 13px;
      font-weight: 800;
      color: var(--slate-900);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .badge-cma {
      background: #eff6ff;
      color: var(--primary);
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }

    .btn-print {
      background: var(--slate-900);
      color: #ffffff;
    }
    .btn-print:hover {
      background: #000000;
      transform: translateY(-1px);
    }

    .btn-whatsapp {
      background: var(--emerald-600);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.25);
    }
    .btn-whatsapp:hover {
      background: #047857;
      transform: translateY(-1px);
    }

    /* Container */
    .container {
      max-width: 960px;
      margin: 24px auto;
      padding: 0 16px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .card {
      background: #ffffff;
      border-radius: 24px;
      border: 1px solid var(--slate-200);
      padding: 28px;
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.04);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--slate-100);
      padding-bottom: 16px;
      margin-bottom: 20px;
      gap: 12px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--slate-900);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Corporate Header Card */
    .corp-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      border-bottom: 1px solid var(--slate-100);
      padding-bottom: 20px;
      margin-bottom: 20px;
    }

    .company-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .company-logo-box {
      width: 50px;
      height: 50px;
      border-radius: 16px;
      background: var(--primary);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 900;
      box-shadow: 0 8px 16px -4px rgba(37, 99, 235, 0.3);
    }

    .company-name {
      font-size: 16px;
      font-weight: 900;
      color: var(--slate-900);
      text-transform: uppercase;
      letter-spacing: -0.3px;
    }

    .company-sub {
      font-size: 12px;
      color: var(--slate-500);
      font-weight: 500;
    }

    .header-dates {
      text-align: right;
      font-size: 11px;
      color: var(--slate-500);
    }

    .header-dates strong {
      display: block;
      font-size: 14px;
      color: var(--slate-900);
      font-weight: 800;
    }

    .dossier-intro {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
      flex-wrap: wrap;
    }

    .dossier-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      background: #eff6ff;
      color: var(--primary);
      border: 1px solid #bfdbfe;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .dossier-heading {
      font-size: 26px;
      font-weight: 900;
      color: var(--slate-900);
      letter-spacing: -0.5px;
      line-height: 1.2;
    }

    .dossier-address {
      font-size: 13px;
      color: var(--slate-600);
      margin-top: 6px;
    }

    .broker-box {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      padding: 12px 18px;
      border-radius: 16px;
      min-width: 220px;
      font-size: 11px;
    }

    .broker-box .label {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 800;
      color: var(--slate-400);
      letter-spacing: 0.5px;
    }

    .broker-box .name {
      font-size: 13px;
      font-weight: 800;
      color: var(--slate-900);
      margin-top: 2px;
    }

    /* Grid Specs */
    .specs-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 24px;
    }

    @media (max-width: 768px) {
      .specs-layout {
        grid-template-columns: 1fr;
      }
    }

    .property-cover {
      border-radius: 18px;
      overflow: hidden;
      background: var(--slate-100);
      aspect-ratio: 4/3;
      position: relative;
      border: 1px solid var(--slate-200);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .property-cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .badge-type {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(8px);
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 8px;
      text-transform: uppercase;
    }

    .grid-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }

    .stat-tile {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      padding: 12px;
      border-radius: 14px;
      text-align: center;
    }

    .stat-tile .label {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--slate-400);
    }

    .stat-tile .value {
      font-size: 16px;
      font-weight: 900;
      color: var(--slate-900);
      margin-top: 2px;
    }

    .grid-costs {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }

    .cost-tile {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      padding: 10px 14px;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }

    .cost-tile .cost-label {
      color: var(--slate-500);
    }

    .cost-tile .cost-val {
      font-weight: 800;
      color: var(--slate-900);
    }

    .amenities-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }

    .amenity-chip {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      color: var(--slate-700);
    }

    /* Termômetro de Mercado */
    .thermometer-bars {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 18px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 16px;
    }

    .bar-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .bar-info {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 700;
    }

    .progress-track {
      width: 100%;
      height: 10px;
      background: var(--slate-200);
      border-radius: 999px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.6s ease;
    }

    .fill-primary { background: var(--primary); }
    .fill-emerald { background: var(--emerald-500); }
    .fill-slate { background: var(--slate-400); }

    .positioning-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .pos-competitivo { background: var(--emerald-50); color: var(--emerald-600); border: 1px solid var(--emerald-100); }
    .pos-abaixo { background: var(--sky-50); color: var(--sky-600); border: 1px solid var(--sky-100); }
    .pos-acima { background: var(--rose-50); color: var(--rose-600); border: 1px solid var(--rose-100); }
    .pos-ligeiramente { background: var(--amber-50); color: var(--amber-600); border: 1px solid var(--amber-100); }

    /* Comparáveis */
    .comparables-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 14px;
    }

    .comp-card {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
    }

    .comp-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }

    .comp-ref {
      font-size: 9px;
      font-weight: 800;
      background: var(--slate-200);
      color: var(--slate-700);
      padding: 2px 6px;
      border-radius: 6px;
      text-transform: uppercase;
    }

    .comp-similarity {
      font-size: 9px;
      font-weight: 800;
      color: var(--primary);
      background: #eff6ff;
      padding: 2px 6px;
      border-radius: 6px;
    }

    .comp-title {
      font-size: 12px;
      font-weight: 800;
      color: var(--slate-900);
      line-height: 1.3;
    }

    .comp-specs {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--slate-500);
      padding: 8px 0;
      border-top: 1px solid var(--slate-200);
    }

    .comp-pricing {
      background: #ffffff;
      border: 1px solid var(--slate-200);
      border-radius: 12px;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    /* 3 Cenários de Preço */
    .pricing-matrix {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    @media (max-width: 768px) {
      .pricing-matrix {
        grid-template-columns: 1fr;
      }
    }

    .price-card {
      border-radius: 20px;
      padding: 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
      position: relative;
    }

    .price-card.oportunidade {
      background: var(--sky-50);
      border: 2px solid #bae6fd;
    }

    .price-card.ideal {
      background: #ecfdf5;
      border: 2px solid var(--emerald-500);
      box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.15);
    }

    .price-card.teto {
      background: var(--rose-50);
      border: 2px solid #fecdd3;
    }

    .price-card-badge {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 3px 8px;
      border-radius: 999px;
      display: inline-block;
      margin-bottom: 8px;
    }

    .badge-ideal { background: #d1fae5; color: #065f46; }
    .badge-oportunidade { background: #e0f2fe; color: #075985; }
    .badge-teto { background: #ffe4e6; color: #9f1239; }

    .price-val {
      font-size: 24px;
      font-weight: 900;
      line-height: 1.1;
      margin: 8px 0 2px 0;
    }

    .price-m2 {
      font-size: 12px;
      font-weight: 700;
    }

    .price-desc {
      font-size: 11px;
      color: var(--slate-600);
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      padding-top: 12px;
      line-height: 1.4;
    }

    .rental-yield-box {
      background: var(--slate-900);
      color: #ffffff;
      padding: 20px 24px;
      border-radius: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
      margin-top: 16px;
    }

    .rental-yield-box .tag {
      color: #93c5fd;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .rental-yield-box h4 {
      font-size: 15px;
      font-weight: 800;
    }

    .rental-yield-box p {
      font-size: 11px;
      color: var(--slate-400);
    }

    /* Parecer Consultivo IA */
    .ia-parecer-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .ia-exec-summary {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 16px;
      padding: 20px;
      font-size: 13px;
      line-height: 1.6;
      color: var(--slate-700);
    }

    .points-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 10px;
    }

    .point-item {
      background: #ffffff;
      border: 1px solid var(--slate-200);
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 12px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      color: var(--slate-700);
    }

    .point-icon {
      color: var(--emerald-500);
      font-size: 14px;
      margin-top: 2px;
    }

    .alert-overprice {
      background: var(--amber-50);
      border: 1px solid #fde68a;
      padding: 18px;
      border-radius: 16px;
      color: #78350f;
      font-size: 12px;
      line-height: 1.5;
    }

    .strategy-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
    }

    .strat-box {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      padding: 18px;
      border-radius: 16px;
      font-size: 12px;
      line-height: 1.5;
      color: var(--slate-700);
    }

    .strat-box.exclusividade {
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      color: #312e81;
    }

    /* Signatures */
    .signatures-block {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid var(--slate-200);
    }

    .sig-field {
      text-align: center;
    }

    .sig-line {
      height: 40px;
      border-bottom: 1px solid var(--slate-400);
      margin-bottom: 8px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      font-style: italic;
      color: var(--slate-400);
      font-size: 11px;
    }

    .sig-name {
      font-size: 12px;
      font-weight: 800;
      color: var(--slate-900);
    }

    .sig-role {
      font-size: 10px;
      color: var(--slate-500);
    }

    /* Print Specific Rules */
    @media print {
      @page {
        size: A4;
        margin: 10mm 12mm;
      }

      body {
        background: #ffffff !important;
        color: #0f172a !important;
        padding: 0 !important;
        font-size: 10pt !important;
      }

      .action-toolbar, .no-print {
        display: none !important;
      }

      .container {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        gap: 16px !important;
      }

      .card {
        border-radius: 12px !important;
        border: 1px solid #cbd5e1 !important;
        padding: 18px !important;
        box-shadow: none !important;
      }

      .page-break {
        page-break-before: always;
        break-before: page;
      }

      .avoid-break {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>

  <!-- FLOATING ACTION TOOLBAR (NO-PRINT) -->
  <div class="action-toolbar no-print">
    <div class="toolbar-title">
      <span>🏢</span>
      <span>${imobiliaria.nome}</span>
      <span class="badge-cma">Laudo CMA Standalone</span>
      <span style="color: var(--slate-400); font-weight: 400;">|</span>
      <span style="color: var(--slate-600); font-weight: 600;">Ref: ${imovel.referencia}</span>
    </div>

    <div class="toolbar-actions">
      <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp">
        <span>💬</span> Compartilhar no WhatsApp
      </a>
      <button onclick="window.print()" class="btn btn-print">
        <span>🖨️</span> Baixar / Imprimir PDF
      </button>
    </div>
  </div>

  <main class="container">

    <!-- HEADER CORPORATIVO -->
    <div class="card avoid-break">
      <div class="corp-header">
        <div class="company-brand">
          <div class="company-logo-box">🏢</div>
          <div>
            <h1 class="company-name">${imobiliaria.nome}</h1>
            <p class="company-sub">
              ${imobiliaria.numero_registro ? `${imobiliaria.numero_registro} • ` : ''}
              ${imobiliaria.identificador_fiscal || 'Inteligência e Avaliação Imobiliária'}
            </p>
          </div>
        </div>

        <div class="header-dates">
          <span>DATA DE EMISSÃO</span>
          <strong>${laudo.dataEmissao}</strong>
          <span style="font-size: 10px;">Validade técnica: 30 dias (${laudo.dataValidade})</span>
        </div>
      </div>

      <div class="dossier-intro">
        <div>
          <span class="dossier-tag">Parecer Técnico de Avaliação Mercadológica (CMA)</span>
          <h2 class="dossier-heading">Estudo de Posicionamento & Precificação</h2>
          <p class="dossier-address">📍 ${imovel.enderecoCompleto}</p>
        </div>

        ${corretor ? `
        <div class="broker-box">
          <div class="label">Consultor Responsável</div>
          <div class="name">${corretor.nome}</div>
          <div style="color: var(--slate-500); font-size: 11px; margin-top: 2px;">
            ${corretor.telefone} ${corretor.email ? `• ${corretor.email}` : ''}
          </div>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- 1. FICHA TÉCNICA -->
    <div class="card avoid-break">
      <div class="card-header">
        <div class="section-title"><span>🏠</span> 1. Ficha Técnica do Imóvel Avaliado</div>
        <span class="badge-cma">Ref: ${imovel.referencia}</span>
      </div>

      <div class="specs-layout">
        <div class="property-cover">
          ${imovel.fotoPrincipal ? `
            <img src="${imovel.fotoPrincipal}" alt="${imovel.titulo}">
          ` : `
            <span style="color: var(--slate-400); font-size: 12px; font-weight: 700;">Foto não informada</span>
          `}
          <div class="badge-type">${imovel.tipo.toUpperCase()}</div>
        </div>

        <div>
          <div class="grid-stats">
            <div class="stat-tile">
              <div class="label">Área Útil</div>
              <div class="value">${imovel.area_util || '—'} m²</div>
            </div>
            <div class="stat-tile">
              <div class="label">${config.terminology.quartosLabel}</div>
              <div class="value">${imovel.quartos || '—'}</div>
            </div>
            <div class="stat-tile">
              <div class="label">Suítes</div>
              <div class="value">${imovel.suites || '0'}</div>
            </div>
            <div class="stat-tile">
              <div class="label">Vagas</div>
              <div class="value">${imovel.vagas_garagem ?? '—'}</div>
            </div>
          </div>

          <div class="grid-costs">
            <div class="cost-tile">
              <span class="cost-label">Condomínio:</span>
              <span class="cost-val">${formatCurrency(imovel.condominio_mensal, config)}/mês</span>
            </div>
            <div class="cost-tile">
              <span class="cost-label">${config.code === 'BR' ? 'IPTU Anual:' : 'IMI Anual:'}</span>
              <span class="cost-val">${formatCurrency(imovel.imi_iptu_anual, config)}</span>
            </div>
            <div class="cost-tile">
              <span class="cost-label">Preço Pretendido:</span>
              <span class="cost-val" style="color: var(--primary);">${formatCurrency(imovel.valorAtual, config)}</span>
            </div>
          </div>

          ${imovel.comodidades && imovel.comodidades.length > 0 ? `
          <div>
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--slate-400); margin-bottom: 6px;">
              Diferenciais e Acabamentos:
            </div>
            <div class="amenities-list">
              ${imovel.comodidades.map(c => `<span class="amenity-chip">✨ ${c}</span>`).join('')}
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- 2. TERMÔMETRO DE MERCADO -->
    <div class="card avoid-break">
      <div class="card-header">
        <div>
          <div class="section-title"><span>📊</span> 2. Termômetro de Mercado & Comparativo de Metro Quadrado</div>
          <p style="font-size: 11px; color: var(--slate-500); margin-top: 2px;">
            Comparativo do valor do m² pretendido versus a mediana consolidada de absorção na região.
          </p>
        </div>
        <span class="positioning-badge ${
          estatisticas.posicionamento === 'abaixo' ? 'pos-abaixo' :
          estatisticas.posicionamento === 'competitivo' ? 'pos-competitivo' :
          estatisticas.posicionamento === 'ligeiramente_acima' ? 'pos-ligeiramente' : 'pos-acima'
        }">
          ${estatisticas.badgeLabel}
        </span>
      </div>

      <div class="thermometer-bars">
        <!-- Imóvel Alvo -->
        <div class="bar-row">
          <div class="bar-info">
            <span style="color: var(--primary); font-weight: 800;">● Este Imóvel (Preço Pretendido)</span>
            <span style="color: var(--primary); font-weight: 900;">${formatCurrency(precoM2Imovel, config)}/m²</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill fill-primary" style="width: ${pctImovel}%;"></div>
          </div>
        </div>

        <!-- Bairro -->
        <div class="bar-row">
          <div class="bar-info">
            <span style="color: var(--emerald-600); font-weight: 800;">● Mediana no Bairro (${imovel.freguesia || imovel.concelho})</span>
            <span style="color: var(--emerald-600); font-weight: 900;">${formatCurrency(estatisticas.precoMedianoM2Bairro, config)}/m²</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill fill-emerald" style="width: ${pctBairro}%;"></div>
          </div>
        </div>

        <!-- Cidade -->
        <div class="bar-row">
          <div class="bar-info">
            <span style="color: var(--slate-600); font-weight: 800;">● Mediana Geral da Cidade (${imovel.concelho})</span>
            <span style="color: var(--slate-700); font-weight: 900;">${formatCurrency(estatisticas.precoMedianoM2Cidade, config)}/m²</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill fill-slate" style="width: ${pctCidade}%;"></div>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div style="background: var(--slate-50); border: 1px solid var(--slate-200); padding: 14px; border-radius: 14px; display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 24px;">📈</div>
          <div>
            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: var(--slate-400);">Variação vs Mediana</div>
            <div style="font-size: 16px; font-weight: 900; color: ${estatisticas.variacaoVsMercadoPct <= 5 ? 'var(--emerald-600)' : 'var(--rose-600)'};">
              ${estatisticas.variacaoVsMercadoPct > 0 ? '+' : ''}${estatisticas.variacaoVsMercadoPct}%
            </div>
          </div>
        </div>

        <div style="background: var(--slate-50); border: 1px solid var(--slate-200); padding: 14px; border-radius: 14px; display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 24px;">🛡️</div>
          <div>
            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: var(--slate-400);">Valorização Anual na Região</div>
            <div style="font-size: 16px; font-weight: 900; color: #4338ca;">
              +${estatisticas.valorizacaoAnualRegiao}% ao ano
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. COMPARÁVEIS -->
    <div class="card avoid-break">
      <div class="card-header">
        <div>
          <div class="section-title"><span>🏘️</span> 3. Imóveis Concorrentes na Mesma Região (Amostragem)</div>
          <p style="font-size: 11px; color: var(--slate-500); margin-top: 2px;">
            Amostra de imóveis de perfil e tipologia semelhantes ativos que concorrem pela mesma demanda de compradores.
          </p>
        </div>
      </div>

      <div class="comparables-grid">
        ${comparaveis.map((comp) => `
        <div class="comp-card">
          <div>
            <div class="comp-header">
              <span class="comp-ref">${comp.referencia}</span>
              <span class="comp-similarity">${comp.similaridade}</span>
            </div>
            <h4 class="comp-title">${comp.titulo}</h4>
            <p style="font-size: 11px; color: var(--slate-500); margin-top: 3px;">📍 ${comp.bairro}, ${comp.cidade}</p>
          </div>

          <div>
            <div class="comp-specs">
              <span>📐 ${comp.area_util}m²</span>
              <span>🛏️ ${comp.quartos || '—'} qts</span>
              <span>🚗 ${comp.vagas || '—'} vag</span>
            </div>
            <div class="comp-pricing">
              <div>
                <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: var(--slate-400);">Valor Total</div>
                <div style="font-size: 13px; font-weight: 900; color: var(--slate-900);">${formatCurrency(comp.valor, config)}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: var(--slate-400);">Preço / m²</div>
                <div style="font-size: 13px; font-weight: 900; color: var(--primary);">${formatCurrency(comp.precoM2, config)}</div>
              </div>
            </div>
          </div>
        </div>
        `).join('')}
      </div>
    </div>

    <!-- 4. MATRIZ DE PRECIFICAÇÃO -->
    <div class="card avoid-break page-break">
      <div class="card-header">
        <div>
          <div class="section-title"><span>🎯</span> 4. Matriz de Precificação Recomendada & Cenários de Liquidez</div>
          <p style="font-size: 11px; color: var(--slate-500); margin-top: 2px;">
            Cenários estratégicos de posicionamento com base na curva de absorção mercadológica.
          </p>
        </div>
      </div>

      <div class="pricing-matrix">
        <!-- Venda Ágil -->
        <div class="price-card oportunidade">
          <div>
            <span class="price-card-badge badge-oportunidade">⚡ ${faixasPreco.oportunidade.destaque} (${faixasPreco.oportunidade.prazoEstimado})</span>
            <h3 style="font-size: 14px; font-weight: 900; color: #0369a1;">${faixasPreco.oportunidade.titulo}</h3>
            <div class="price-val" style="color: #0369a1;">${formatCurrency(faixasPreco.oportunidade.precoTotal, config)}</div>
            <div class="price-m2" style="color: #0284c7;">${formatCurrency(faixasPreco.oportunidade.precoM2, config)}/m²</div>
          </div>
          <p class="price-desc">${faixasPreco.oportunidade.descricao}</p>
        </div>

        <!-- Preço Ideal -->
        <div class="price-card ideal">
          <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: var(--emerald-600); color: #ffffff; font-size: 9px; font-weight: 900; text-transform: uppercase; padding: 2px 10px; border-radius: 999px;">
            ⭐ RECOMENDADO IMOBIA
          </div>
          <div>
            <span class="price-card-badge badge-ideal">🎯 Valor Justo (${faixasPreco.ideal.prazoEstimado})</span>
            <h3 style="font-size: 14px; font-weight: 900; color: #065f46;">${faixasPreco.ideal.titulo}</h3>
            <div class="price-val" style="color: #047857;">${formatCurrency(faixasPreco.ideal.precoTotal, config)}</div>
            <div class="price-m2" style="color: #059669;">${formatCurrency(faixasPreco.ideal.precoM2, config)}/m²</div>
          </div>
          <p class="price-desc">${faixasPreco.ideal.descricao}</p>
        </div>

        <!-- Preço Teto -->
        <div class="price-card teto">
          <div>
            <span class="price-card-badge badge-teto">⚠️ ${faixasPreco.teto.destaque} (${faixasPreco.teto.prazoEstimado})</span>
            <h3 style="font-size: 14px; font-weight: 900; color: #9f1239;">${faixasPreco.teto.titulo}</h3>
            <div class="price-val" style="color: #be123c;">${formatCurrency(faixasPreco.teto.precoTotal, config)}</div>
            <div class="price-m2" style="color: #e11d48;">${formatCurrency(faixasPreco.teto.precoM2, config)}/m²</div>
          </div>
          <p class="price-desc">${faixasPreco.teto.descricao}</p>
        </div>
      </div>

      <!-- Rental Yield -->
      <div class="rental-yield-box">
        <div>
          <div class="tag">Rentabilidade Patrimonial (Rental Yield)</div>
          <h4>Estimativa para Locação / Arrendamento Mensal</h4>
          <p>${locacao.observacao}</p>
        </div>
        <div style="display: flex; gap: 24px; text-align: right;">
          <div>
            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: var(--slate-400);">Aluguel Estimado</div>
            <div style="font-size: 18px; font-weight: 900; color: #34d399;">${formatCurrency(locacao.valorMensalEstimado, config)}<span style="font-size: 11px; font-weight: 400;">/mês</span></div>
          </div>
          <div>
            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: var(--slate-400);">Yield Anual</div>
            <div style="font-size: 18px; font-weight: 900; color: #93c5fd;">${locacao.rentalYieldAnualPct}% a.a.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. PARECER CONSULTIVO IA -->
    <div class="card avoid-break">
      <div class="card-header">
        <div>
          <div class="section-title"><span>🤖</span> 5. Parecer Técnico Consultivo ImobIA</div>
          <p style="font-size: 11px; color: var(--slate-500); margin-top: 2px;">
            Diagnóstico estratégico fundamentado para maximização de valor e captação qualificada.
          </p>
        </div>
        <span class="badge-cma">✨ Inteligência de Mercado</span>
      </div>

      <div class="ia-parecer-section">
        <!-- Resumo -->
        <div class="ia-exec-summary">
          <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: var(--slate-900); margin-bottom: 6px;">
            📌 Resumo Executivo & Diagnóstico
          </div>
          <p>${safeParecer.resumo_executivo}</p>
        </div>

        <!-- Pontos Fortes -->
        <div>
          <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: var(--slate-900); margin-bottom: 8px;">
            ✨ Principais Diferenciais e Pontos Fortes
          </div>
          <div class="points-grid">
            ${safeParecer.pontos_fortes.map(pt => `
              <div class="point-item">
                <span class="point-icon">✔</span>
                <span>${pt}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Alerta de Sobrepreço -->
        <div class="alert-overprice">
          <div style="font-weight: 900; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">
            ⚠️ Alerta Técnico: Riscos da Sobreprecificação
          </div>
          <p>${safeParecer.alerta_sobrepreco}</p>
        </div>

        <!-- Estratégia e Exclusividade -->
        <div class="strategy-grid">
          <div class="strat-box">
            <div style="font-weight: 900; font-size: 11px; text-transform: uppercase; color: var(--slate-900); margin-bottom: 6px;">
              🚀 Estratégia Comercial Recomendada
            </div>
            <p>${safeParecer.estrategia_recomendada}</p>
          </div>

          <div class="strat-box exclusividade">
            <div style="font-weight: 900; font-size: 11px; text-transform: uppercase; margin-bottom: 6px;">
              🤝 Vantagens da Captação Exclusiva
            </div>
            <p>${safeParecer.argumento_exclusividade}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 6. ASSINATURA & RESPONSABILIDADE -->
    <div class="card avoid-break">
      <div style="text-align: center; max-width: 600px; margin: 0 auto;">
        <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: var(--slate-400); letter-spacing: 1px;">
          Declaração de Responsabilidade Técnica
        </div>
        <p style="font-size: 11px; color: var(--slate-500); margin-top: 6px; line-height: 1.5;">
          Este Estudo Mercadológico Comparativo (CMA) foi elaborado com base nas normas técnicas de avaliação e amostragem direta de mercado, cruzando bases de transações e ofertas concorrentes na região.
        </p>
      </div>

      <div class="signatures-block">
        <div class="sig-field">
          <div class="sig-line">Assinatura do Consultor</div>
          <div class="sig-name">${corretor?.nome || 'Consultor Imobiliário Responsável'}</div>
          <div class="sig-role">${corretor?.telefone || ''} ${imobiliaria.numero_registro ? `• ${imobiliaria.numero_registro}` : ''}</div>
        </div>

        <div class="sig-field">
          <div class="sig-line">Diretoria Técnica</div>
          <div class="sig-name">${imobiliaria.nome}</div>
          <div class="sig-role">${imobiliaria.identificador_fiscal || 'Imobiliária Credenciada'}</div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 24px; font-size: 9px; color: var(--slate-400);">
        ImobIA Platform © ${new Date().getFullYear()} • Documento emitido em ${laudo.dataEmissao}
      </div>
    </div>

  </main>

</body>
</html>`;
}
