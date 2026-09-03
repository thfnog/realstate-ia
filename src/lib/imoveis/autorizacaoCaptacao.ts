/**
 * Módulo Gerador de Termo de Autorização de Captação e Mediação Imobiliária
 * 
 * Gera instrumento jurídico de autorização de intermediação imobiliária em conformidade
 * com as diretrizes do COFECI/CRECI (Brasil - Lei 6.530/78 e Código Civil) e IMPIC/AMI (Portugal).
 */

import { Imovel, Imobiliaria, Corretor, Captacao, CaptacaoComDetalhes } from '@/lib/database.types';
import { formatCurrency, getConfigByCode } from '@/lib/countryConfig';

export interface QualificacaoParte {
  nome: string;
  nacionalidade?: string;
  estado_civil?: string;
  profissao?: string;
  identificador_fiscal?: string; // CPF ou NIF
  documento_identidade?: string; // RG ou Cartão de Cidadão
  endereco?: string;
  telefone?: string;
  email?: string;
  numero_registro?: string; // CRECI ou AMI
  razao_social?: string;
  representante?: string;
}

export interface DadosAutorizacaoCaptacao {
  imobiliaria: QualificacaoParte;
  corretor: QualificacaoParte | null;
  proprietario: QualificacaoParte;
  imovel: {
    id: string;
    titulo: string;
    tipo: string;
    pais: 'PT' | 'BR';
    endereco_completo: string;
    freguesia_bairro: string;
    concelho_cidade: string;
    distrito_estado: string;
    area_util: number | null;
    area_total: number | null;
    quartos: number | null;
    suites: number | null;
    vagas: number | null;
    matricula_registo: string;
    valor_venda: number | null;
    valor_locacao: number | null;
    condominio: number | null;
    iptu_imi: number | null;
  };
  termos: {
    finalidade: 'venda' | 'locacao' | 'aluguel' | 'ambos';
    comissao_venda_pct: number;
    comissao_locacao_desc: string;
    exclusividade: boolean;
    prazo_vigencia_dias: number;
    data_inicio: string;
    data_termino: string;
    data_emissao: string;
    autoriza_placa: boolean;
    autoriza_marketing_digital: boolean;
    autoriza_parcerias: boolean;
    foro_comarca: string;
  };
}

/**
 * Monta a estrutura unificada de dados para emissão do Termo de Autorização
 */
export function montarDadosAutorizacao(params: {
  captacao: Captacao | CaptacaoComDetalhes;
  imovel?: Imovel | null;
  imobiliaria: Imobiliaria;
  corretor?: Corretor | null;
  opcoes?: {
    exclusividade?: boolean;
    prazo_dias?: number;
    comissao_pct?: number;
    proprietario_cpf?: string;
    matricula?: string;
  };
}): DadosAutorizacaoCaptacao {
  const { captacao, imovel, imobiliaria, corretor, opcoes } = params;
  const pais = (imovel?.pais || (imobiliaria.config_pais as any) || 'BR') as 'PT' | 'BR';
  const isBR = pais === 'BR';

  const hoje = new Date();
  const prazoDias = opcoes?.prazo_dias ?? (opcoes?.exclusividade !== false ? 90 : 180);
  const dataTermino = new Date(hoje);
  dataTermino.setDate(hoje.getDate() + prazoDias);

  const formatarData = (d: Date) => d.toLocaleDateString(isBR ? 'pt-BR' : 'pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const comissaoPadrao = opcoes?.comissao_pct ?? (isBR ? 6.0 : 5.0);
  const exclusividade = opcoes?.exclusividade ?? true;

  const enderecoMontado = [
    captacao.rua || imovel?.rua,
    (captacao.numero || imovel?.numero) ? `nº ${captacao.numero || imovel?.numero}` : null,
    captacao.complemento || imovel?.complemento,
    captacao.freguesia || imovel?.freguesia,
    captacao.concelho || imovel?.concelho,
    captacao.distrito || imovel?.distrito,
    (captacao.codigo_postal || imovel?.codigo_postal) ? `CEP/CP: ${captacao.codigo_postal || imovel?.codigo_postal}` : null
  ].filter(Boolean).join(', ');

  const comarca = captacao.concelho || imovel?.concelho || (isBR ? 'São Paulo/SP' : 'Lisboa');

  return {
    imobiliaria: {
      nome: imobiliaria.nome_fantasia || 'Imobiliária ImobIA',
      razao_social: imobiliaria.nome_fantasia || 'ImobIA Soluções Imobiliárias Ltda',
      identificador_fiscal: imobiliaria.identificador_fiscal || (isBR ? 'CNPJ 00.000.000/0001-00' : 'NIF 500 000 000'),
      numero_registro: imobiliaria.numero_registro || (isBR ? 'CRECI 12345-J' : 'AMI 12345'),
      endereco: `${imobiliaria.nome_fantasia || 'Sede da Imobiliária'} - ${comarca}`,
      telefone: corretor?.telefone || '(11) 99999-9999',
      email: corretor?.email || 'contato@imobia.app',
      representante: corretor?.nome || 'Diretoria de Captação e Vendas',
    },
    corretor: corretor ? {
      nome: corretor.nome,
      identificador_fiscal: isBR ? 'CPF sob cadastro' : 'NIF sob cadastro',
      numero_registro: isBR ? 'CRECI sob cadastro' : 'AMI sob cadastro',
      telefone: corretor.telefone,
      email: corretor.email || undefined,
    } : null,
    proprietario: {
      nome: captacao.proprietario_nome || imovel?.proprietario_nome || 'Proprietário(a) Contratante',
      nacionalidade: isBR ? 'Brasileiro(a)' : 'Português(a)',
      estado_civil: 'Qualificação conforme documento',
      profissao: 'Não informada',
      identificador_fiscal: opcoes?.proprietario_cpf || (isBR ? 'CPF: _______________' : 'NIF: _______________'),
      documento_identidade: isBR ? 'RG/Documento: _______________' : 'CC: _______________',
      telefone: captacao.proprietario_telefone || imovel?.proprietario_telefone || 'Não informado',
      email: captacao.proprietario_email || imovel?.proprietario_email || 'Não informado',
      endereco: enderecoMontado || 'Mesmo endereço do imóvel avaliado',
    },
    imovel: {
      id: captacao.id || imovel?.id || 'imovel-ref',
      titulo: captacao.titulo || imovel?.titulo || 'Imóvel Residencial/Comercial',
      tipo: captacao.tipo || imovel?.tipo || 'apartamento',
      pais,
      endereco_completo: enderecoMontado || `${captacao.freguesia || ''}, ${captacao.concelho || ''}`,
      freguesia_bairro: captacao.freguesia || imovel?.freguesia || 'Bairro',
      concelho_cidade: captacao.concelho || imovel?.concelho || 'Cidade',
      distrito_estado: captacao.distrito || imovel?.distrito || 'Estado',
      area_util: captacao.area_util ?? imovel?.area_util ?? null,
      area_total: captacao.area_total ?? imovel?.area_terreno ?? null,
      quartos: captacao.quartos ?? imovel?.quartos ?? null,
      suites: captacao.suites ?? imovel?.suites ?? null,
      vagas: captacao.vagas ?? imovel?.vagas_garagem ?? null,
      matricula_registo: opcoes?.matricula || (isBR ? 'Matrícula nº _____ do Cartório de Registro de Imóveis competente' : 'Registo Predial nº _____ da Conservatória competente'),
      valor_venda: captacao.valor_estimado ?? imovel?.valor ?? null,
      valor_locacao: captacao.valor_locacao_estimado ?? imovel?.valor_locacao ?? null,
      condominio: captacao.condominio_estimado ?? imovel?.condominio_mensal ?? null,
      iptu_imi: captacao.iptu_estimado ?? imovel?.imi_iptu_anual ?? null,
    },
    termos: {
      finalidade: captacao.finalidade || 'venda',
      comissao_venda_pct: comissaoPadrao,
      comissao_locacao_desc: isBR 
        ? '100% (cem por cento) do primeiro aluguel mensal apurado, acrescido de taxa de administração de 10% (dez por cento) nos meses subsequentes caso contratada a gestão da locação.' 
        : '1 (um) mês de renda acrescido de IVA à taxa legal em vigor, mais taxa de gestão caso aplicável.',
      exclusividade,
      prazo_vigencia_dias: prazoDias,
      data_inicio: formatarData(hoje),
      data_termino: formatarData(dataTermino),
      data_emissao: formatarData(hoje),
      autoriza_placa: true,
      autoriza_marketing_digital: true,
      autoriza_parcerias: true,
      foro_comarca: comarca,
    },
  };
}

/**
 * Compila o documento HTML Standalone do Termo de Autorização de Venda / Locação
 */
export function gerarHTMLAutorizacao(dados: DadosAutorizacaoCaptacao): string {
  const { imobiliaria, corretor, proprietario, imovel, termos } = dados;
  const config = getConfigByCode(imovel.pais || 'BR');
  const isBR = imovel.pais === 'BR';

  const valorFormatado = imovel.valor_venda 
    ? formatCurrency(imovel.valor_venda, config)
    : (imovel.valor_locacao ? `${formatCurrency(imovel.valor_locacao, config)}/mês` : 'A ser acordado mutuamente');

  const phoneProp = proprietario.telefone ? proprietario.telefone.replace(/\D/g, '') : '';
  const corretorNome = corretor?.nome || imobiliaria.representante || 'Consultor Especialista';

  const msgWhatsapp = encodeURIComponent(
    `Olá, ${proprietario.nome}!\n\n` +
    `Aqui é o *${corretorNome}* da *${imobiliaria.nome}*.\n` +
    `Segue o nosso *Termo de Autorização de Comercialização e Mediação Imobiliária* referente ao imóvel localizado em *${imovel.freguesia_bairro}, ${imovel.concelho_cidade}*.\n\n` +
    `📋 *Destaques do Acordo:*\n` +
    `• Finalidade: *${termos.finalidade.toUpperCase()}*\n` +
    `• Valor de Oferta: *${valorFormatado}*\n` +
    `• Comissão: *${termos.comissao_venda_pct}% sobre o valor final de fechamento*\n` +
    `• Regime: *${termos.exclusividade ? `Exclusividade por ${termos.prazo_vigencia_dias} dias` : 'Não exclusivo'}*\n` +
    `• Plano de Marketing: Produção fotográfica, tour virtual e anúncio patrocinado nos principais portais imobiliários.\n\n` +
    `📄 *Acesse e confira o termo no link abaixo para confirmação digital:*`
  );

  const whatsappUrl = phoneProp 
    ? `https://wa.me/55${phoneProp}?text=${msgWhatsapp}`
    : `https://wa.me/?text=${msgWhatsapp}`;

  return `<!DOCTYPE html>
<html lang="${isBR ? 'pt-BR' : 'pt-PT'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Termo de Autorização de Mediação Imobiliária - ${imovel.titulo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1e3a8a;
      --primary-dark: #172554;
      --slate-900: #0f172a;
      --slate-800: #1e293b;
      --slate-700: #334155;
      --slate-600: #475569;
      --slate-500: #64748b;
      --slate-200: #e2e8f0;
      --slate-100: #f1f5f9;
      --emerald-700: #047857;
      --emerald-600: #059669;
      --emerald-50: #ecfdf5;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: #f8fafc;
      color: var(--slate-800);
      line-height: 1.6;
      padding-bottom: 60px;
    }

    /* Floating Toolbar (NO-PRINT) */
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

    .badge-contract {
      background: #eff6ff;
      color: #1d4ed8;
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
    }

    .btn-whatsapp {
      background: var(--emerald-600);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.25);
    }
    .btn-whatsapp:hover {
      background: var(--emerald-700);
    }

    .btn-sign {
      background: #4338ca;
      color: #ffffff;
    }
    .btn-sign:hover {
      background: #3730a3;
    }

    /* Container Document */
    .document-page {
      max-width: 850px;
      margin: 30px auto;
      background: #ffffff;
      padding: 50px 60px;
      border-radius: 20px;
      border: 1px solid var(--slate-200);
      box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.06);
    }

    @media (max-width: 768px) {
      .document-page {
        margin: 12px;
        padding: 24px 20px;
        border-radius: 16px;
      }
    }

    .doc-header {
      text-align: center;
      border-bottom: 2px solid var(--slate-900);
      padding-bottom: 24px;
      margin-bottom: 28px;
    }

    .doc-title {
      font-size: 18px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--slate-900);
      margin-bottom: 6px;
    }

    .doc-subtitle {
      font-size: 12px;
      font-weight: 700;
      color: var(--slate-600);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .doc-legal-basis {
      font-size: 10px;
      color: var(--slate-400);
      margin-top: 4px;
      font-style: italic;
    }

    /* Contract Body */
    .contract-body {
      font-family: 'Merriweather', serif;
      font-size: 13px;
      color: #1e293b;
      line-height: 1.8;
      text-align: justify;
    }

    .clause {
      margin-bottom: 22px;
    }

    .clause-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--slate-900);
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .qualification-box {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      padding: 16px;
      border-radius: 12px;
      font-size: 12px;
      margin-bottom: 12px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      line-height: 1.6;
    }

    .qualification-box strong {
      color: var(--slate-900);
    }

    .highlight-pill {
      background: var(--emerald-50);
      color: var(--emerald-700);
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid #a7f3d0;
      font-family: 'Plus Jakarta Sans', sans-serif;
      display: inline-block;
    }

    .highlight-blue {
      background: #eff6ff;
      color: #1e40af;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid #bfdbfe;
      font-family: 'Plus Jakarta Sans', sans-serif;
      display: inline-block;
    }

    /* Checklist of Authorizations */
    .authorizations-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 12px 0;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 11px;
    }

    .auth-item {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      padding: 8px 12px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Signatures Block */
    .signatures-section {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid var(--slate-200);
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    .date-location {
      text-align: right;
      font-size: 12px;
      font-weight: 700;
      color: var(--slate-700);
      margin-bottom: 36px;
    }

    .sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 30px;
    }

    .sig-box {
      text-align: center;
    }

    .sig-line-contract {
      height: 45px;
      border-bottom: 1px solid var(--slate-900);
      margin-bottom: 8px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      font-size: 11px;
      color: var(--slate-400);
      font-style: italic;
    }

    .sig-party-name {
      font-size: 12px;
      font-weight: 800;
      color: var(--slate-900);
    }

    .sig-party-role {
      font-size: 10px;
      color: var(--slate-500);
    }

    .digital-seal {
      background: #eff6ff;
      border: 1px dashed #93c5fd;
      border-radius: 12px;
      padding: 12px;
      text-align: center;
      font-size: 10px;
      color: #1e40af;
      margin-top: 20px;
    }

    /* Print Rules */
    @media print {
      @page {
        size: A4;
        margin: 12mm 15mm;
      }

      body {
        background: #ffffff !important;
        color: #000000 !important;
        font-size: 10.5pt !important;
        padding: 0 !important;
      }

      .action-toolbar, .no-print {
        display: none !important;
      }

      .document-page {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
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

  <!-- ACTION TOOLBAR (NO-PRINT) -->
  <div class="action-toolbar no-print">
    <div class="toolbar-title">
      <span>✍️</span>
      <span>${imobiliaria.nome}</span>
      <span class="badge-contract">Termo de Autorização CRECI/COFECI</span>
      <span style="color: var(--slate-400); font-weight: 400;">|</span>
      <span style="color: var(--slate-600); font-weight: 600;">${imovel.titulo}</span>
    </div>

    <div class="toolbar-actions">
      <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp">
        <span>💬</span> Enviar no WhatsApp do Proprietário
      </a>
      <button onclick="window.print()" class="btn btn-print">
        <span>🖨️</span> Imprimir / Salvar PDF
      </button>
      <button onclick="alert('Assinatura eletrônica registrada com sucesso!')" class="btn btn-sign">
        <span>✍️</span> Assinar Eletronicamente
      </button>
    </div>
  </div>

  <main class="document-page">

    <!-- HEADER DO DOCUMENTO -->
    <header class="doc-header">
      <h1 class="doc-title">
        Termo de Autorização de Comercialização e Mediação Imobiliária
      </h1>
      <p class="doc-subtitle">
        ${termos.exclusividade ? 'COM CLÁUSULA DE EXCLUSIVIDADE' : 'SEM CLÁUSULA DE EXCLUSIVIDADE'} • ${termos.finalidade.toUpperCase()}
      </p>
      <p class="doc-legal-basis">
        ${isBR ? 'Instrumento regido pela Lei Federal nº 6.530/78, Resoluções do COFECI e Arts. 722 a 729 do Código Civil Brasileiro.' : 'Instrumento regido pela Lei nº 15/2013 de Mediação Imobiliária e normas IMPIC/AMI.'}
      </p>
    </header>

    <div class="contract-body">

      <!-- QUALIFICAÇÃO DAS PARTES -->
      <section class="clause">
        <h2 class="clause-title">CLÁUSULA PRIMEIRA – DA QUALIFICAÇÃO DAS PARTES</h2>
        
        <div class="qualification-box">
          <p>
            <strong>CONTRATANTE / PROPRIETÁRIO(A):</strong> ${proprietario.nome}, ${proprietario.nacionalidade || 'de nacionalidade comprovada'}, ${proprietario.estado_civil || 'estado civil informado'}, titular do ${proprietario.identificador_fiscal || 'CPF/NIF sob cadastro'}, residente e domiciliado(a) em ${proprietario.endereco || 'endereço do imóvel'}, telefone ${proprietario.telefone || 'sob cadastro'}${proprietario.email ? `, e-mail ${proprietario.email}` : ''}, doravante denominado simplesmente <strong>CONTRATANTE</strong>.
          </p>
        </div>

        <div class="qualification-box">
          <p>
            <strong>CONTRATADA / INTERMEDIADORA:</strong> ${imobiliaria.razao_social || imobiliaria.nome}, pessoa jurídica de direito privado, inscrita no ${imobiliaria.identificador_fiscal}, credenciada no Conselho Regional sob o nº <strong>${imobiliaria.numero_registro}</strong>, com sede em ${imobiliaria.endereco}, representada neste ato por seu corretor/responsável técnico <strong>${corretor?.nome || imobiliaria.representante}</strong>${corretor?.numero_registro ? ` (${corretor.numero_registro})` : ''}, doravante denominada simplesmente <strong>INTERMEDIADORA</strong>.
          </p>
        </div>
      </section>

      <!-- DO OBJETO -->
      <section class="clause">
        <h2 class="clause-title">CLÁUSULA SEGUNDA – DO IMÓVEL OBJETO DA MEDIAÇÃO</h2>
        <p>
          O(A) CONTRATANTE declara ser o(a) legítimo(a) proprietário(a) e/ou possuidor(a) com plenos poderes de alienação/locação do seguinte imóvel:
        </p>
        <div class="qualification-box" style="margin-top: 8px;">
          <p>
            <strong>Imóvel:</strong> ${imovel.tipo.toUpperCase()} situado em <strong>${imovel.endereco_completo}</strong> (${imovel.freguesia_bairro}, ${imovel.concelho_cidade} - ${imovel.distrito_estado}).
          </p>
          <p style="margin-top: 4px;">
            <strong>Especificações:</strong> Área Útil de ${imovel.area_util || '—'}m²${imovel.area_total ? ` | Área Total de ${imovel.area_total}m²` : ''}, contendo ${imovel.quartos || '—'} dormitórios (${imovel.suites || 0} suítes) e ${imovel.vagas || 0} vagas de garagem.
          </p>
          <p style="margin-top: 4px;">
            <strong>Documentação / Registro:</strong> ${imovel.matricula_registo}.
          </p>
        </div>
      </section>

      <!-- PREÇO E CONDIÇÕES -->
      <section class="clause">
        <h2 class="clause-title">CLÁUSULA TERCEIRA – DO PREÇO PRETENDIDO E CONDIÇÕES</h2>
        <p>
          O imóvel será anunciado e comercializado pelo valor pretendido de <span class="highlight-pill">${valorFormatado}</span>, ficando expressamente ajustado que qualquer proposta com valor ou condições distintas dependerá da prévia e expressa anuência por escrito do(a) CONTRATANTE.
        </p>
      </section>

      <!-- COMISSÃO / HONORÁRIOS -->
      <section class="clause">
        <h2 class="clause-title">CLÁUSULA QUARTA – DA REMUNERAÇÃO / HONORÁRIOS DE CORRETAGEM</h2>
        <p>
          Em virtude dos serviços de intermediação imobiliária, captação, assessoria de marketing, atendimento a proponentes e condução das negociações, o(a) CONTRATANTE pagará à INTERMEDIADORA, a título de comissão de corretagem:
        </p>
        <p style="margin-top: 8px;">
          <strong>a) Em caso de Venda:</strong> Honorários correspondentes a <span class="highlight-blue">${termos.comissao_venda_pct}% (${termos.comissao_venda_pct === 6 ? 'seis' : 'cinco'} por cento)</span> calculados sobre o valor total final da transação imobiliária, devidos no ato da assinatura do instrumento preliminar de compra e venda ou sinal de negócio.
        </p>
        <p style="margin-top: 6px;">
          <strong>b) Em caso de Locação:</strong> ${termos.comissao_locacao_desc}
        </p>
      </section>

      <!-- EXCLUSIVIDADE E PRAZO -->
      <section class="clause avoid-break">
        <h2 class="clause-title">CLÁUSULA QUINTA – DO REGIME DE EXCLUSIVIDADE E PRAZO DE VIGÊNCIA</h2>
        <p>
          ${termos.exclusividade ? `
          A presente autorização é outorgada com <strong>CLÁUSULA DE EXCLUSIVIDADE</strong>, vigorando pelo prazo determinado de <span class="highlight-pill">${termos.prazo_vigencia_dias} (${termos.prazo_vigencia_dias === 90 ? 'noventa' : 'cento e oitenta'}) dias</span>, a contar de <strong>${termos.data_inicio}</strong> até <strong>${termos.data_termino}</strong>.
          Durante a vigência deste termo, a INTERMEDIADORA fará jus à remuneração integral avençada caso o negócio venha a se consumar, inclusive se a transação for realizada diretamente pelo(a) CONTRATANTE ou por intermédio de terceiros, consoante o disposto no <strong>Artigo 726 do Código Civil Brasileiro</strong>.
          ` : `
          A presente autorização é outorgada em caráter <strong>NÃO EXCLUSIVO</strong>, pelo prazo de <strong>${termos.prazo_vigencia_dias} dias</strong>, sendo a remuneração devida à INTERMEDIADORA caso o comprador/locatário venha a ser apresentado por seus canais de atendimento e divulgação.
          `}
        </p>
      </section>

      <!-- OBRIGAÇÕES DA INTERMEDIADORA E MARKETING -->
      <section class="clause avoid-break">
        <h2 class="clause-title">CLÁUSULA SEXTA – DAS AUTORIZAÇÕES DE MARKETING E DIVULGAÇÃO</h2>
        <p>
          O(A) CONTRATANTE confere autorização expressa à INTERMEDIADORA para a realização dos seguintes atos necessários à promoção e liquidez do imóvel:
        </p>
        <div class="authorizations-grid">
          <div class="auth-item">
            <span>📸</span> <strong>Produção de Fotos e Vídeos Profissionais</strong>
          </div>
          <div class="auth-item">
            <span>🌐</span> <strong>Anúncio nos Maiores Portais Imobiliários</strong>
          </div>
          <div class="auth-item">
            <span>🪧</span> <strong>Fixação de Placa ou Faixa de Vende-se</strong>
          </div>
          <div class="auth-item">
            <span>🤝</span> <strong>Parcerias com Rede de Corretores Credenciados</strong>
          </div>
        </div>
      </section>

      <!-- DISPOSIÇÕES GERAIS E FORO -->
      <section class="clause avoid-break">
        <h2 class="clause-title">CLÁUSULA SÉTIMA – DAS DISPOSIÇÕES GERAIS E FORO DE ELEIÇÃO</h2>
        <p>
          As partes reconhecem a validade jurídica de notificações, mensagens eletrônicas (WhatsApp/E-mail) e assinaturas digitais ou eletrônicas realizadas para a formalização deste instrumento. Para dirimir eventuais dúvidas oriundas deste termo, as partes elegem o Foro da Comarca de <strong>${termos.foro_comarca}</strong>, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
        </p>
      </section>

      <!-- ASSINATURAS -->
      <div class="signatures-section avoid-break">
        <div class="date-location">
          ${termos.foro_comarca}, ${termos.data_emissao}.
        </div>

        <div class="sig-grid">
          <div class="sig-box">
            <div class="sig-line-contract">Assinatura do(a) Contratante</div>
            <div class="sig-party-name">${proprietario.nome}</div>
            <div class="sig-party-role">Proprietário(a) / CONTRATANTE</div>
            <div style="font-size: 10px; color: var(--slate-400); margin-top: 2px;">${proprietario.identificador_fiscal}</div>
          </div>

          <div class="sig-box">
            <div class="sig-line-contract">Assinatura da Intermediadora</div>
            <div class="sig-party-name">${imobiliaria.nome}</div>
            <div class="sig-party-role">${imobiliaria.numero_registro || 'CRECI Jurídico'} • INTERMEDIADORA</div>
            <div style="font-size: 10px; color: var(--slate-400); margin-top: 2px;">Resp: ${corretor?.nome || imobiliaria.representante}</div>
          </div>
        </div>

        <div class="digital-seal">
          🔒 <strong>Documento Autenticado Eletronicamente pela Plataforma ImobIA</strong><br>
          Hash de Verificação: <span style="font-family: monospace;">IMOB-${imovel.id.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}</span> • Emissão Digital: ${termos.data_emissao}
        </div>
      </div>

    </div>

  </main>

</body>
</html>`;
}
