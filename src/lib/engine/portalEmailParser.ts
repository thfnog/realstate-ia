/**
 * Parser de E-mails de Portais Imobiliários Brasileiros
 * Suporta: Imovelweb, Chaves na Mão, Loft, Casa Mineira, QuintoAndar e OLX (+ ZAP / VivaReal e genéricos)
 */

import type { LeadFormData, LeadSource, StatusLead } from '@/lib/database.types';

export type BRPortalType = 
  | 'imovelweb'
  | 'chavesnamao'
  | 'loft'
  | 'casamineira'
  | 'quintoandar'
  | 'olx'
  | 'zap_vivareal'
  | 'generico_br';

export interface ParsedPortalLead {
  nome: string;
  email: string | null;
  telefone: string;
  codigo_referencia: string | null;
  descricao_interesse: string;
  portal: string;
  portal_tipo: BRPortalType;
  finalidade: 'comprar' | 'alugar';
  tipo_imovel?: 'apartamento' | 'casa' | 'terreno' | 'comercial';
  orcamento?: number | null;
  bairro?: string | null;
  cidade?: string | null;
  raw_message?: string;
}

/**
 * Sanitiza telefone brasileiro para formato padronizado com DDD
 * Ex: (11) 98765-4321 -> +5511987654321 ou 11987654321
 */
export function sanitizeBRPhone(phone: string): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  
  if (clean.length === 10 || clean.length === 11) {
    return `+55${clean}`;
  }
  if (clean.length === 12 || clean.length === 13) {
    if (clean.startsWith('55')) return `+${clean}`;
  }
  if (phone.startsWith('+')) {
    return `+${clean}`;
  }
  return clean ? `+55${clean}` : '';
}

/**
 * Detecta o portal de origem baseado no remetente, assunto ou corpo do e-mail
 */
export function detectBRPortal(body: string, subject = '', from = ''): BRPortalType {
  const combined = `${from} ${subject} ${body}`.toLowerCase();

  if (combined.includes('imovelweb') || combined.includes('imovel web') || combined.includes('navent')) {
    return 'imovelweb';
  }
  if (combined.includes('chaves na mão') || combined.includes('chavesnamao') || combined.includes('chaves na mao')) {
    return 'chavesnamao';
  }
  if (combined.includes('loft.com') || combined.includes('loft')) {
    return 'loft';
  }
  if (combined.includes('casa mineira') || combined.includes('casamineira')) {
    return 'casamineira';
  }
  if (combined.includes('quintoandar') || combined.includes('quinto andar')) {
    return 'quintoandar';
  }
  if (combined.includes('olx.com') || combined.includes('olx')) {
    return 'olx';
  }
  if (combined.includes('zapimoveis') || combined.includes('vivareal') || combined.includes('grupo zap')) {
    return 'zap_vivareal';
  }

  return 'generico_br';
}

/**
 * Normaliza o nome do portal para exibição amigável
 */
export function getPortalLabel(portalType: BRPortalType): string {
  const map: Record<BRPortalType, string> = {
    imovelweb: 'Imovelweb',
    chavesnamao: 'Chaves na Mão',
    loft: 'Loft',
    casamineira: 'Casa Mineira',
    quintoandar: 'QuintoAndar',
    olx: 'OLX',
    zap_vivareal: 'ZAP / VivaReal',
    generico_br: 'Portal Imobiliário'
  };
  return map[portalType] || 'Portal Imobiliário';
}

/**
 * Extrai texto correspondente a uma expressão regular
 */
function extractFirstMatch(text: string, regex: RegExp): string | null {
  const match = text.match(regex);
  return match && match[1] ? match[1].trim() : null;
}

/**
 * Parser principal de e-mails de portais brasileiros
 */
export function parsePortalEmail(
  body: string, 
  subject = '', 
  from = ''
): ParsedPortalLead {
  const portalType = detectBRPortal(body, subject, from);
  const portalLabel = getPortalLabel(portalType);

  // Normalização de quebras de linha e remoção de tags HTML simples
  const cleanBody = body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ');

  let nome = 'Lead Portal';
  let email: string | null = null;
  let rawPhone = '';
  let codigoReferencia: string | null = null;
  let mensagem = '';
  let finalidade: 'comprar' | 'alugar' = 'comprar';
  let tipoImovel: 'apartamento' | 'casa' | 'terreno' | 'comercial' | undefined;
  let orcamento: number | null = null;
  let bairro: string | null = null;
  let cidade: string | null = null;

  // Detecção de Finalidade (Locação / Venda)
  const lowerBody = cleanBody.toLowerCase();
  const lowerSubject = subject.toLowerCase();
  if (
    lowerBody.includes('aluguel') || 
    lowerBody.includes('locação') || 
    lowerBody.includes('locacao') || 
    lowerSubject.includes('aluguel') ||
    lowerSubject.includes('locação')
  ) {
    finalidade = 'alugar';
  } else if (
    lowerBody.includes('compra') || 
    lowerBody.includes('comprar') || 
    lowerBody.includes('venda') ||
    lowerSubject.includes('venda')
  ) {
    finalidade = 'comprar';
  }

  // Detecção de Tipo de Imóvel
  if (lowerBody.includes('apartamento') || lowerBody.includes('apto')) {
    tipoImovel = 'apartamento';
  } else if (lowerBody.includes('casa') || lowerBody.includes('sobrado')) {
    tipoImovel = 'casa';
  } else if (lowerBody.includes('terreno') || lowerBody.includes('lote')) {
    tipoImovel = 'terreno';
  } else if (lowerBody.includes('comercial') || lowerBody.includes('sala') || lowerBody.includes('galpão')) {
    tipoImovel = 'comercial';
  }

  // Detecção por Portal Específico
  switch (portalType) {
    case 'imovelweb': {
      nome = extractFirstMatch(cleanBody, /(?:Nome|Lead|Interessado|Cliente):\s*([^\n\r]+)/i) || nome;
      email = extractFirstMatch(cleanBody, /(?:E-mail|Email|E-mail do interessado):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      rawPhone = extractFirstMatch(cleanBody, /(?:Telefone|Celular|WhatsApp|Fone):\s*([0-9()+\-\s.]{8,20})/i) || '';
      codigoReferencia = extractFirstMatch(cleanBody, /(?:Código do anúncio|Cód\. anúncio|Código|Ref\.|Referência|Aviso):\s*([A-Za-z0-9\-_]+)/i);
      mensagem = extractFirstMatch(cleanBody, /(?:Mensagem|Comentário|Dúvida|Observação):\s*([\s\S]*?)(?=(?:\n[A-Z][a-z]+:|\n---|\nAtenciosamente|$))/i) || '';
      break;
    }

    case 'chavesnamao': {
      nome = extractFirstMatch(cleanBody, /(?:Nome do interessado|Nome do cliente|Nome):\s*([^\n\r]+)/i) || nome;
      email = extractFirstMatch(cleanBody, /(?:E-mail|Email):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      rawPhone = extractFirstMatch(cleanBody, /(?:Contato|Telefone|WhatsApp|Celular):\s*([0-9()+\-\s.]{8,20})/i) || '';
      codigoReferencia = extractFirstMatch(cleanBody, /(?:Imóvel Ref\.?|Referência|Código do imóvel|Cód):\s*([A-Za-z0-9\-_]+)/i);
      mensagem = extractFirstMatch(cleanBody, /(?:Mensagem enviada|Mensagem):\s*([\s\S]*?)(?=(?:\n[A-Z][a-z]+:|\n---|$))/i) || '';
      break;
    }

    case 'loft': {
      nome = extractFirstMatch(cleanBody, /(?:Lead|Nome do interessado|Nome):\s*([^\n\r]+)/i) || nome;
      email = extractFirstMatch(cleanBody, /(?:E-mail|Email):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      rawPhone = extractFirstMatch(cleanBody, /(?:Telefone|WhatsApp|Contato):\s*([0-9()+\-\s.]{8,20})/i) || '';
      codigoReferencia = extractFirstMatch(cleanBody, /(?:Referência Loft|Ref\.|Código do imóvel|Imóvel ID):\s*([A-Za-z0-9\-_]+)/i);
      mensagem = extractFirstMatch(cleanBody, /(?:Mensagem|Detalhes da solicitação|Observações):\s*([\s\S]*?)(?=(?:\n[A-Z][a-z]+:|\n---|$))/i) || '';
      break;
    }

    case 'casamineira': {
      nome = extractFirstMatch(cleanBody, /(?:Cliente|Nome|Interessado):\s*([^\n\r]+)/i) || nome;
      email = extractFirstMatch(cleanBody, /(?:E-mail|Email):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      rawPhone = extractFirstMatch(cleanBody, /(?:Tel \/ Cel|Telefone|WhatsApp|Celular):\s*([0-9()+\-\s.]{8,20})/i) || '';
      codigoReferencia = extractFirstMatch(cleanBody, /(?:Código|Cód\.?|Referência):\s*([A-Za-z0-9\-_]+)/i);
      mensagem = extractFirstMatch(cleanBody, /(?:Mensagem|Observação):\s*([\s\S]*?)(?=(?:\n[A-Z][a-z]+:|\n---|$))/i) || '';
      break;
    }

    case 'quintoandar': {
      nome = extractFirstMatch(cleanBody, /(?:Inquilino|Comprador|Interessado|Cliente|Nome):\s*([^\n\r]+)/i) || nome;
      email = extractFirstMatch(cleanBody, /(?:E-mail|Email):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      rawPhone = extractFirstMatch(cleanBody, /(?:Telefone|WhatsApp|Celular):\s*([0-9()+\-\s.]{8,20})/i) || '';
      codigoReferencia = extractFirstMatch(cleanBody, /(?:Imóvel|Código do imóvel|Cód\.?|Ref):\s*([A-Za-z0-9\-_]+)/i);
      mensagem = extractFirstMatch(cleanBody, /(?:Mensagem|Detalhes|Proposta):\s*([\s\S]*?)(?=(?:\n[A-Z][a-z]+:|\n---|$))/i) || '';
      break;
    }

    case 'olx': {
      nome = extractFirstMatch(cleanBody, /(?:Nome|Usuário OLX|Interessado):\s*([^\n\r]+)/i) || nome;
      email = extractFirstMatch(cleanBody, /(?:E-mail|Email):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      rawPhone = extractFirstMatch(cleanBody, /(?:Telefone|Celular|WhatsApp):\s*([0-9()+\-\s.]{8,20})/i) || '';
      codigoReferencia = extractFirstMatch(cleanBody, /(?:Código OLX|Cód\. anúncio|Número do anúncio|Anúncio ID|Ref):\s*([A-Za-z0-9\-_]+)/i);
      mensagem = extractFirstMatch(cleanBody, /(?:Mensagem|Texto do contato):\s*([\s\S]*?)(?=(?:\n[A-Z][a-z]+:|\n---|$))/i) || '';
      break;
    }

    default: {
      nome = extractFirstMatch(cleanBody, /(?:Nome|Lead|Cliente|Interessado|De):\s*([^\n\r]+)/i) || nome;
      email = extractFirstMatch(cleanBody, /(?:E-mail|Email):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      rawPhone = extractFirstMatch(cleanBody, /(?:Telefone|WhatsApp|Celular|Fone|Tel|Contato):\s*([0-9()+\-\s.]{8,20})/i) || '';
      codigoReferencia = extractFirstMatch(cleanBody, /(?:Código|Ref\.?|Referência|Cód\. anúncio|Imóvel):\s*([A-Za-z0-9\-_]+)/i);
      mensagem = extractFirstMatch(cleanBody, /(?:Mensagem|Comentário|Observação|Dúvida):\s*([\s\S]*?)(?=(?:\n[A-Z][a-z]+:|\n---|$))/i) || '';
      break;
    }
  }

  // Fallback para e-mail se regex genérico encontrar no corpo
  if (!email) {
    const generalEmailMatch = cleanBody.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (generalEmailMatch && !generalEmailMatch[1].includes('no-reply') && !generalEmailMatch[1].includes('noreply')) {
      email = generalEmailMatch[1];
    }
  }

  // Fallback para telefone se não encontrado diretamente
  if (!rawPhone) {
    const generalPhoneMatch = cleanBody.match(/(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s.]?\d{4}/);
    if (generalPhoneMatch) {
      rawPhone = generalPhoneMatch[0];
    }
  }

  // Extrair Bairro / Cidade caso conste explicitamente
  const bairroMatch = extractFirstMatch(cleanBody, /(?:Bairro|Localização|Região):\s*([^\n\r,]+)/i);
  if (bairroMatch) bairro = bairroMatch.trim();

  const cidadeMatch = extractFirstMatch(cleanBody, /(?:Cidade|Município):\s*([^\n\r,]+)/i);
  if (cidadeMatch) cidade = cidadeMatch.trim();

  // Extrair Orçamento se mencionado
  const orcamentoMatch = cleanBody.match(/(?:R\$|Valor|Preço|Orçamento):\s*([0-9.,]+)/i);
  if (orcamentoMatch) {
    const rawVal = orcamentoMatch[1].replace(/\./g, '').replace(',', '.');
    const num = parseFloat(rawVal);
    if (!isNaN(num) && num > 1000) orcamento = num;
  }

  // Sanitização do nome
  nome = nome
    .replace(/^[:\-\s]+/, '')
    .replace(/<[^>]+>/g, '')
    .trim();

  if (nome.length > 80) nome = nome.slice(0, 80);

  // Formatação final da descrição
  let finalDescricao = mensagem ? mensagem.trim() : '';
  if (codigoReferencia) {
    const refLine = `[Ref Imóvel Portal: ${codigoReferencia}]`;
    finalDescricao = finalDescricao ? `${refLine}\n${finalDescricao}` : refLine;
  }

  return {
    nome: nome || 'Lead Portal',
    email: email || null,
    telefone: sanitizeBRPhone(rawPhone),
    codigo_referencia: codigoReferencia || null,
    descricao_interesse: finalDescricao || `Interesse registrado através do portal ${portalLabel}`,
    portal: portalLabel,
    portal_tipo: portalType,
    finalidade,
    tipo_imovel: tipoImovel,
    orcamento,
    bairro,
    cidade,
    raw_message: cleanBody.slice(0, 500)
  };
}

/**
 * Converte o resultado do parser para o formato esperado de criação do Lead
 */
export function portalLeadToLeadData(
  parsed: ParsedPortalLead, 
  imobiliariaId: string
): Partial<LeadFormData> & { imobiliaria_id: string; origem: LeadSource; moeda: string; portal_origem: string; status: StatusLead } {
  return {
    imobiliaria_id: imobiliariaId,
    nome: parsed.nome,
    email: parsed.email || undefined,
    telefone: parsed.telefone,
    origem: 'portal_email' as LeadSource,
    portal_origem: parsed.portal,
    descricao_interesse: parsed.descricao_interesse,
    finalidade: parsed.finalidade,
    tipo_interesse: parsed.tipo_imovel,
    orcamento: parsed.orcamento || undefined,
    bairros_interesse: parsed.bairro ? [parsed.bairro] : undefined,
    moeda: 'BRL',
    status: 'novo'
  };
}
