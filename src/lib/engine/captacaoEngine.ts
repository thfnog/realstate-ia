/**
 * Motor de Captação de Imóveis via WhatsApp com IA
 * 
 * Processa mensagens livres (texto e áudio transcrito) e fotos enviadas por corretores,
 * extrai os dados estruturados do imóvel usando callAIWithFallback, salva no banco de dados,
 * executa o Reverse Matching de leads e retorna a resposta formatada para o corretor no WhatsApp.
 */

import { callAIWithFallback, parseSafeJSON } from './aiUtils';
import { supabaseAdmin } from '@/lib/supabase';
import { getImovelRepository, getCaptacaoRepository } from '@/lib/repositories/factory';
import { matchLeadsForProperty } from './reverseMatching';
import { getConfig } from '@/lib/countryConfig';
import type { Imovel, ImovelFoto, TipoImovel, Moeda, Lead } from '@/lib/database.types';

export interface CaptacaoExtractedData {
  titulo: string;
  tipo: TipoImovel;
  finalidade: 'venda' | 'aluguel' | 'ambos';
  negocio?: 'residencial' | 'comercial' | 'misto' | 'rural' | 'industrial' | 'investimento' | null;
  
  // Localização
  distrito?: string | null; // Estado
  concelho?: string | null; // Cidade
  freguesia?: string | null; // Bairro
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  codigo_postal?: string | null;

  // Características
  area_util?: number | null;
  area_construida?: number | null;
  area_total?: number | null;
  quartos?: number | null;
  suites?: number | null;
  casas_banho?: number | null;
  vagas_garagem?: number;
  comodidades?: string[];

  // Financeiro
  valor?: number;
  valor_locacao?: number | null;
  condominio_mensal?: number | null;
  imi_iptu_anual?: number | null;

  // Proprietário
  proprietario_nome?: string | null;
  proprietario_telefone?: string | null;
  proprietario_email?: string | null;

  // Descrição gerada pela IA
  descricao: string;
  pontos_venda?: string[];
  observacoes_internas?: string | null;
  confianca_extracao?: number;
}

export interface ProcessCaptacaoParams {
  text: string;
  audioTranscription?: string | null;
  mediaUrls?: string[];
  corretor_id?: string | null;
  corretor_nome?: string | null;
  imobiliaria_id: string;
  config_pais?: 'PT' | 'BR';
}

export interface ProcessCaptacaoResult {
  success: boolean;
  imovel?: Imovel;
  captacaoId?: string;
  extractedData: CaptacaoExtractedData;
  matchingLeads: Lead[];
  matchingLeadsCount: number;
  replyMessage: string;
  error?: string;
}

/**
 * Extrai dados estruturados do imóvel a partir de texto livre ou áudio com IA
 */
export async function extractCaptacaoDataWithAI(
  text: string,
  imobiliaria_id?: string,
  config_pais: 'PT' | 'BR' = 'BR'
): Promise<CaptacaoExtractedData> {
  const isBR = config_pais === 'BR';
  const currencyCode = isBR ? 'R$' : '€';

  const systemPrompt = `
Você é o especialista sênior em avaliação, captação e copywriting imobiliário do ImobIA (${isBR ? 'Brasil' : 'Portugal'}).
Sua tarefa é analisar mensagens enviadas por corretores de imóveis (anotações de visita, mensagens de áudio transcritas, áudios descritivos) e transformar as informações em um cadastro completo e profissional de imóvel.

OBJETIVOS:
1. Extrair todos os dados objetivos do imóvel (tipo, valores, localização, dimensões, cômodos, proprietário).
2. Criar um "titulo" comercial altamente atrativo e profissional (Ex: "Apartamento de Alto Padrão nos Jardins com 3 Suítes e Varanda Gourmet").
3. Criar uma "descricao" comercial rica, persuasiva e formatada com bullet points dos destaques do imóvel.
4. Normalizar campos para números puros (ex: "850 mil" -> 850000, "1.2M" -> 1200000, "3k de condomínio" -> 3000, "120m²" -> 120).

TIPOS PERMITIDOS:
'apartamento', 'apartamento_duplex', 'cobertura', 'kitnet', 'flat', 'casa', 'casa_condominio', 'sobrado', 'chacara', 'sitio', 'fazenda', 'terreno', 'lote', 'sala_comercial', 'loja', 'escritorio', 'galpao', 'barracao'.

FINALIDADES:
'venda', 'aluguel', 'ambos'.

RETORNE APENAS UM JSON VÁLIDO NO SEGUINTE FORMATO:
{
  "titulo": "Título comercial atrativo",
  "tipo": "apartamento",
  "finalidade": "venda",
  "negocio": "residencial",
  "distrito": "${isBR ? 'SP' : 'Lisboa'}",
  "concelho": "${isBR ? 'São Paulo' : 'Lisboa'}",
  "freguesia": "Nome do Bairro",
  "rua": "Nome da Rua (se citado)",
  "numero": "Número (se citado)",
  "complemento": "Apto/Bloco (se citado)",
  "codigo_postal": "CEP/Código Postal (se citado)",
  "area_util": 120,
  "area_construida": 140,
  "area_total": 140,
  "quartos": 3,
  "suites": 1,
  "casas_banho": 2,
  "vagas_garagem": 2,
  "valor": 850000,
  "valor_locacao": null,
  "condominio_mensal": 800,
  "imi_iptu_anual": 1500,
  "proprietario_nome": "Nome do Proprietário (se citado)",
  "proprietario_telefone": "Telefone com DDD (se citado)",
  "proprietario_email": null,
  "comodidades": ["Piscina", "Varanda Gourmet", "Churrasqueira", "Academia", "Portaria 24h"],
  "pontos_venda": ["Vista livre", "Andar alto", "Próximo ao metrô"],
  "descricao": "Texto persuasivo estruturado com:\\n✨ Destaques do Imóvel\\n🛋️ Ambientes e Distribuição\\n🏢 Estrutura do Condomínio / Lazer\\n📍 Localização Privilegiada",
  "observacoes_internas": "Notas adicionais de negociação ou do proprietário",
  "confianca_extracao": 0.95
}
`;

  const userPrompt = `DADOS DA CAPTAÇÃO ENVIADOS PELO CORRETOR:\n"""\n${text}\n"""`;

  try {
    const aiResponse = await callAIWithFallback({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
      imobiliaria_id,
      feature: 'captacao_extractor'
    });

    const content = aiResponse.choices?.[0]?.message?.content || '{}';
    const parsed = parseSafeJSON(content);

    return {
      titulo: parsed.titulo || 'Novo Imóvel Captado',
      tipo: (parsed.tipo as TipoImovel) || 'apartamento',
      finalidade: parsed.finalidade || 'venda',
      negocio: parsed.negocio || 'residencial',
      distrito: parsed.distrito || (isBR ? 'SP' : 'Lisboa'),
      concelho: parsed.concelho || (isBR ? 'São Paulo' : 'Lisboa'),
      freguesia: parsed.freguesia || 'Centro',
      rua: parsed.rua || null,
      numero: parsed.numero || null,
      complemento: parsed.complemento || null,
      codigo_postal: parsed.codigo_postal || null,
      area_util: parsed.area_util ? Number(parsed.area_util) : null,
      area_construida: parsed.area_construida ? Number(parsed.area_construida) : (parsed.area_total ? Number(parsed.area_total) : null),
      area_total: parsed.area_total ? Number(parsed.area_total) : (parsed.area_util ? Number(parsed.area_util) : null),
      quartos: parsed.quartos ? Number(parsed.quartos) : null,
      suites: parsed.suites ? Number(parsed.suites) : null,
      casas_banho: parsed.casas_banho ? Number(parsed.casas_banho) : (parsed.banheiros ? Number(parsed.banheiros) : null),
      vagas_garagem: parsed.vagas_garagem ? Number(parsed.vagas_garagem) : (parsed.vagas ? Number(parsed.vagas) : 0),
      comodidades: Array.isArray(parsed.comodidades) ? parsed.comodidades : [],
      valor: parsed.valor ? Number(parsed.valor) : 0,
      valor_locacao: parsed.valor_locacao ? Number(parsed.valor_locacao) : null,
      condominio_mensal: parsed.condominio_mensal ? Number(parsed.condominio_mensal) : null,
      imi_iptu_anual: parsed.imi_iptu_anual ? Number(parsed.imi_iptu_anual) : null,
      proprietario_nome: parsed.proprietario_nome || null,
      proprietario_telefone: parsed.proprietario_telefone || null,
      proprietario_email: parsed.proprietario_email || null,
      descricao: parsed.descricao || text,
      pontos_venda: Array.isArray(parsed.pontos_venda) ? parsed.pontos_venda : [],
      observacoes_internas: parsed.observacoes_internas || null,
      confianca_extracao: parsed.confianca_extracao || 0.90
    };
  } catch (error: any) {
    console.error('❌ Erro na extração com IA da captação:', error);
    // Fallback defensivo caso a IA falhe
    return {
      titulo: 'Novo Imóvel Captado via WhatsApp',
      tipo: 'apartamento',
      finalidade: 'venda',
      freguesia: 'Centro',
      concelho: isBR ? 'São Paulo' : 'Lisboa',
      distrito: isBR ? 'SP' : 'Lisboa',
      valor: 0,
      descricao: text,
      confianca_extracao: 0.5
    };
  }
}

/**
 * Processa a captação completa: IA + Persistência + Reverse Matching + Resposta WhatsApp
 */
export async function processCaptacao(params: ProcessCaptacaoParams): Promise<ProcessCaptacaoResult> {
  const fullInput = [params.text, params.audioTranscription].filter(Boolean).join('\n');
  const configPais = params.config_pais || 'BR';
  const config = getConfig();
  const moeda: Moeda = configPais === 'BR' ? 'BRL' : 'EUR';

  console.log(`🏗️ [CaptacaoEngine] Iniciando processamento de captação para imobiliária: ${params.imobiliaria_id}...`);

  // 1. Extração estruturada com IA
  const extracted = await extractCaptacaoDataWithAI(fullInput, params.imobiliaria_id, configPais);

  // 2. Preparar fotos
  const fotosFormatadas: ImovelFoto[] = (params.mediaUrls || []).map((url, idx) => ({
    id: `foto-${Date.now()}-${idx}`,
    url_thumb: url,
    url_media: url,
    url_original: url,
    legenda: idx === 0 ? 'Foto Principal' : `Foto ${idx + 1}`,
    ordem: idx,
    is_capa: idx === 0
  }));

  // 3. Salvar o imóvel no repositório de imóveis
  const imovelRepo = getImovelRepository(supabaseAdmin);
  const captacaoRepo = getCaptacaoRepository(supabaseAdmin);

  let imovelSalvo: Imovel;
  try {
    imovelSalvo = await imovelRepo.create({
      imobiliaria_id: params.imobiliaria_id,
      titulo: extracted.titulo,
      tipo: extracted.tipo,
      pais: configPais,
      distrito: extracted.distrito || 'SP',
      concelho: extracted.concelho || 'São Paulo',
      freguesia: extracted.freguesia || 'Centro',
      rua: extracted.rua || null,
      numero: extracted.numero || null,
      complemento: extracted.complemento || null,
      codigo_postal: extracted.codigo_postal || null,
      latitude: null,
      longitude: null,
      finalidade: extracted.finalidade as any,
      negocio: extracted.negocio || 'residencial',
      empreendimento: null,
      corretor_id: params.corretor_id || null,
      data_captacao: new Date().toISOString(),
      origem_captacao: 'whatsapp_corretor',
      proprietario_nome: extracted.proprietario_nome || null,
      proprietario_telefone: extracted.proprietario_telefone || null,
      proprietario_email: extracted.proprietario_email || null,
      area_util: extracted.area_util || null,
      area_construida: extracted.area_construida || null,
      area_privativa: extracted.area_util || null,
      area_terreno: extracted.area_total || null,
      area_bruta: extracted.area_total || null,
      quartos: extracted.quartos || null,
      suites: extracted.suites || null,
      casas_banho: extracted.casas_banho || null,
      salas: 1,
      vagas_garagem: extracted.vagas_garagem || 0,
      andar: null,
      num_andares: null,
      num_torres: null,
      ano_construcao: null,
      estado_conservacao: null,
      certificado_energetico: null,
      orientacao_solar: null,
      comodidades: extracted.comodidades || [],
      comodidades_condominio: [],
      valor: extracted.valor || 0,
      valor_locacao: extracted.valor_locacao || null,
      moeda,
      valor_avaliacao: null,
      imi_iptu_anual: extracted.imi_iptu_anual || null,
      condominio_mensal: extracted.condominio_mensal || null,
      seguro_incendio_mensal: null,
      taxa_administracao_pct: null,
      aceita_permuta: false,
      aceita_financiamento: true,
      descricao: extracted.descricao,
      pontos_venda: extracted.pontos_venda || [],
      observacoes_internas: extracted.observacoes_internas || null,
      video_url: null,
      tour_360_url: null,
      status: 'disponivel',
      fotos: fotosFormatadas
    });

    console.log(`✅ Imóvel criado com sucesso! Ref: ${imovelSalvo.referencia} (ID: ${imovelSalvo.id})`);
  } catch (err: any) {
    console.error('❌ Falha ao salvar imóvel no repositório:', err);
    throw new Error(`Erro ao salvar imóvel: ${err.message}`);
  }

  // 4. Salvar também no funil de captações como 'publicado'
  let captacaoId: string | undefined;
  try {
    const captacao = await captacaoRepo.create({
      imobiliaria_id: params.imobiliaria_id,
      corretor_id: params.corretor_id || null,
      imovel_id: imovelSalvo.id,
      titulo: extracted.titulo,
      tipo: extracted.tipo,
      finalidade: extracted.finalidade,
      status: 'publicado',
      origem: 'whatsapp',
      proprietario_nome: extracted.proprietario_nome,
      proprietario_telefone: extracted.proprietario_telefone,
      proprietario_email: extracted.proprietario_email,
      distrito: extracted.distrito,
      concelho: extracted.concelho,
      freguesia: extracted.freguesia,
      rua: extracted.rua,
      numero: extracted.numero,
      complemento: extracted.complemento,
      codigo_postal: extracted.codigo_postal,
      area_util: extracted.area_util,
      area_total: extracted.area_total,
      quartos: extracted.quartos,
      suites: extracted.suites,
      banheiros: extracted.casas_banho,
      vagas: extracted.vagas_garagem,
      valor_estimado: extracted.valor,
      valor_locacao_estimado: extracted.valor_locacao,
      condominio_estimado: extracted.condominio_mensal,
      iptu_estimado: extracted.imi_iptu_anual,
      descricao: extracted.descricao,
      observacoes: extracted.observacoes_internas,
      fotos: params.mediaUrls || [],
      dados_ia: {
        confianca_extracao: extracted.confianca_extracao,
        pontos_venda: extracted.pontos_venda,
        comodidades: extracted.comodidades
      }
    });
    captacaoId = captacao.id;
  } catch (err) {
    console.warn('⚠️ Não foi possível sincronizar captação no funil:', err);
  }

  // 5. Executar Reverse Matching para encontrar compradores na base
  let matchingLeads: Lead[] = [];
  try {
    matchingLeads = await matchLeadsForProperty(imovelSalvo);
    console.log(`🎯 Reverse Matching encontrou ${matchingLeads.length} leads compatíveis!`);
  } catch (err) {
    console.error('❌ Erro no Reverse Matching:', err);
  }

  // 6. Formatar mensagem de confirmação para o WhatsApp do corretor
  const valorFormatado = extracted.valor
    ? (configPais === 'BR' ? `R$ ${extracted.valor.toLocaleString('pt-BR')}` : `€ ${extracted.valor.toLocaleString('pt-PT')}`)
    : (extracted.valor_locacao ? (configPais === 'BR' ? `R$ ${extracted.valor_locacao.toLocaleString('pt-BR')}/mês` : `€ ${extracted.valor_locacao.toLocaleString('pt-PT')}/mês`) : 'Sob consulta');

  let leadsSection = '';
  if (matchingLeads.length > 0) {
    const leadNames = matchingLeads.slice(0, 3).map(l => `• *${l.nome}* (${l.telefone})`).join('\n');
    leadsSection = `\n\n🎯 *Match Reverso de Leads (${matchingLeads.length} encontrados):*\n${leadNames}${matchingLeads.length > 3 ? `\n...e mais ${matchingLeads.length - 3} leads na base!` : ''}\n_Os leads compatíveis já podem ser contatados no CRM._`;
  } else {
    leadsSection = `\n\n🔍 _Nenhum lead com busca idêntica no momento. O imóvel já está disponível no catálogo e nos feeds de portais!_`;
  }

  const replyMessage = `🎉 *Imóvel Cadastrado com Sucesso!*\n\n📋 *Ref:* ${imovelSalvo.referencia}\n🏠 *Título:* ${imovelSalvo.titulo}\n📍 *Localização:* ${imovelSalvo.freguesia}, ${imovelSalvo.concelho}\n💰 *Valor:* ${valorFormatado}\n📐 *Área:* ${imovelSalvo.area_util || '--'} m² | 🛏️ ${imovelSalvo.quartos || '--'} qtos (${imovelSalvo.suites || 0} suítes) | 🚗 ${imovelSalvo.vagas_garagem || 0} vagas\n👤 *Proprietário:* ${extracted.proprietario_nome || 'Não informado'} ${extracted.proprietario_telefone ? `(${extracted.proprietario_telefone})` : ''}${leadsSection}\n\n🔗 *Acesse a ficha completa no painel:* https://realstate-ia.vercel.app/admin/imoveis/${imovelSalvo.id}`;

  return {
    success: true,
    imovel: imovelSalvo,
    captacaoId,
    extractedData: extracted,
    matchingLeads,
    matchingLeadsCount: matchingLeads.length,
    replyMessage
  };
}
