/**
 * Group Radar Engine — Inteligência de Monitoramento de Grupos de WhatsApp
 *
 * Separa "Oferta de Imóvel" (outros corretores/proprietários anunciando) de
 * "Demanda de Cliente" (alguém procurando imóvel), evitando poluir a fila de leads
 * com anúncios e cruzando automaticamente:
 *   1. Oferta no grupo  <--> Leads compradores ativos na carteira do corretor
 *   2. Demanda no grupo <--> Imóveis disponíveis na carteira do corretor
 */

import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import { getParceiroRepository, getOportunidadeRepository } from '@/lib/repositories/factory';
import { recommendImoveis, ScoredImovel } from './recommendImoveis';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import type { AILeadProfile } from './aiExtractor';
import type { Lead } from '@/lib/database.types';

export interface GroupRadarInput {
  imobiliariaId: string;
  groupJid: string;
  groupName: string;
  senderName: string;
  senderPhone: string;
  text: string;
  extracted: AILeadProfile;
  corretorId?: string | null;
  corretorPhone?: string | null;
  instanceName?: string;
  configPais?: 'BR' | 'PT';
}

export interface GroupRadarResult {
  handled: boolean;
  action: 'ignored_noise' | 'created_offer_opportunity' | 'created_demand_partner_opportunity' | 'pass_to_lead_flow';
  matchedImovel?: ScoredImovel | null;
  matchedLead?: Lead | null;
  oportunidadeId?: string;
}

/**
 * Busca leads ativos na carteira do corretor que procuram o imóvel anunciado no grupo
 */
async function findMatchingActiveLeadsForOffer(
  imobiliariaId: string,
  extracted: AILeadProfile
): Promise<Lead[]> {
  let activeLeads: Lead[] = [];

  if (mock.isMockMode()) {
    activeLeads = mock
      .getLeads({ imobId: imobiliariaId })
      .filter((l) => !['vendido', 'descartado', 'finalizado'].includes(l.status));
  } else {
    const { data } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('imobiliaria_id', imobiliariaId)
      .not('status', 'in', '("vendido","descartado","finalizado")');
    activeLeads = (data || []) as Lead[];
  }

  if (activeLeads.length === 0) return [];

  const offerBairro = (extracted.freguesia || '').toLowerCase().trim();
  const offerTipo = (extracted.tipo_interesse || '').toLowerCase().trim();
  const offerValor = extracted.orcamento || null;
  const offerQuartos = extracted.quartos || null;

  const scoredLeads = activeLeads
    .map((lead) => {
      let pts = 0;

      // 1. Tipo de imóvel
      if (offerTipo && lead.tipo_interesse) {
        if (lead.tipo_interesse.toLowerCase() === offerTipo) pts += 4;
        else return { lead, pts: -10 }; // Tipo incompatível
      }

      // 2. Bairro
      if (offerBairro && lead.bairros_interesse && lead.bairros_interesse.length > 0) {
        const matchBairro = lead.bairros_interesse.some((b) => {
          const bn = b.toLowerCase().trim();
          return bn.includes(offerBairro) || offerBairro.includes(bn);
        });
        if (matchBairro) pts += 5;
      }

      // 3. Orçamento (dentro de ±25%)
      if (offerValor && lead.orcamento) {
        if (offerValor <= lead.orcamento * 1.2) {
          pts += 4;
        } else {
          return { lead, pts: -10 }; // Acima do teto do cliente
        }
      }

      // 4. Quartos
      if (offerQuartos && lead.quartos_interesse) {
        if (offerQuartos >= lead.quartos_interesse) pts += 2;
      }

      return { lead, pts };
    })
    .filter((item) => item.pts >= 5)
    .sort((a, b) => b.pts - a.pts);

  return scoredLeads.map((s) => s.lead);
}

/**
 * Processa mensagem vinda de grupo autorizado no Radar
 */
export async function processGroupRadarMessage(input: GroupRadarInput): Promise<GroupRadarResult> {
  const {
    imobiliariaId,
    groupName,
    senderName,
    senderPhone,
    text,
    extracted,
    corretorId,
    corretorPhone,
    instanceName,
    configPais = 'BR',
  } = input;

  const tipoGrupo = extracted.tipo_mensagem_grupo || (extracted.is_lead ? 'demanda_cliente' : 'ruido');

  // 1. Ruído ou conversa social em grupo -> ignora imediatamente
  if (tipoGrupo === 'ruido' || (!extracted.is_lead && tipoGrupo !== 'oferta_imovel')) {
    return { handled: true, action: 'ignored_noise' };
  }

  const parceiroRepo = getParceiroRepository(supabaseAdmin);
  const oportRepo = getOportunidadeRepository(supabaseAdmin);

  // 2. OFERTA DE IMÓVEL NO GRUPO (Corretor/proprietário divulgando imóvel)
  // Nunca vira Lead comprador! Vai para Oportunidades e cruza com os Leads ativos do corretor.
  if (tipoGrupo === 'oferta_imovel') {
    const matchedLeads = await findMatchingActiveLeadsForOffer(imobiliariaId, extracted);
    const bestLead = matchedLeads[0] || null;

    // Se não tem match com nenhum cliente da carteira e não tem dados mínimos (bairro ou preço), ignora para não gerar spam
    const hasMinimumOfferData = !!(extracted.freguesia || extracted.orcamento || extracted.tipo_interesse);
    if (!bestLead && !hasMinimumOfferData) {
      return { handled: true, action: 'ignored_noise' };
    }

    let parceiro = await parceiroRepo.findByTelefone(senderPhone, imobiliariaId);
    if (!parceiro) {
      parceiro = await parceiroRepo.create({
        imobiliaria_id: imobiliariaId,
        nome: senderName || `Contato Grupo #${senderPhone.slice(-4)}`,
        telefone: senderPhone,
        ativo: true,
        total_negocios: 0,
        notas: `Captado via grupo "${groupName}".`,
      });
    }

    const resumoImovel = [
      extracted.tipo_interesse ? extracted.tipo_interesse.toUpperCase() : 'Imóvel',
      extracted.quartos ? `${extracted.quartos} qtos` : null,
      extracted.freguesia ? `em ${extracted.freguesia}` : null,
      extracted.orcamento ? `R$ ${extracted.orcamento.toLocaleString('pt-BR')}` : null,
    ]
      .filter(Boolean)
      .join(' • ');

    const titulo = bestLead
      ? `🔥 Match p/ ${bestLead.nome}: ${resumoImovel}`
      : `📢 Oferta no Grupo (${groupName}): ${resumoImovel}`;

    const oport = await oportRepo.create({
      imobiliaria_id: imobiliariaId,
      parceiro_id: parceiro.id,
      corretor_id: corretorId || bestLead?.corretor_id || null,
      lead_id: bestLead?.id || null,
      tipo: extracted.finalidade === 'alugar' ? 'parceria_locacao' : 'parceria_venda',
      titulo,
      descricao: `Grupo: ${groupName}\nAnunciante: ${senderName} (${senderPhone})\n${
        bestLead ? `🎯 Cliente compatível na sua carteira: ${bestLead.nome} (${bestLead.telefone})\n` : ''
      }\nMensagem original:\n"${text}"`,
      status: 'nova',
      valor_estimado: extracted.orcamento || null,
    });

    // Só envia alerta no WhatsApp do corretor quando dá MATCH com um cliente ativo dele!
    if (bestLead && corretorPhone) {
      const alertMsg =
        `🔥 *RADAR DE GRUPO — IMÓVEL PARA SEU CLIENTE!*\n\n` +
        `No grupo *${groupName}*, *${senderName}* (${senderPhone}) anunciou:\n` +
        `_"${text.slice(0, 140)}${text.length > 140 ? '...' : ''}"_\n\n` +
        `👤 *Bate com a busca do seu cliente:* *${bestLead.nome}*\n` +
        `📍 *Perfil:* ${resumoImovel}\n\n` +
        `Salvo na aba *Oportunidades* do seu painel.`;

      await sendWhatsAppMessage(corretorPhone, alertMsg, instanceName, configPais);
    }

    return {
      handled: true,
      action: 'created_offer_opportunity',
      matchedLead: bestLead,
      oportunidadeId: oport.id,
    };
  }

  // 3. DEMANDA DE CLIENTE NO GRUPO (Alguém procurando imóvel para comprar/alugar)
  // Cruza com o inventário de imóveis disponíveis do corretor!
  const syntheticLead: Lead = {
    id: 'radar-temp',
    imobiliaria_id: imobiliariaId,
    nome: senderName || 'Demanda Grupo',
    telefone: senderPhone,
    origem: 'whatsapp',
    portal_origem: `WhatsApp Grupo: ${groupName}`,
    moeda: configPais === 'PT' ? 'EUR' : 'BRL',
    finalidade: (extracted.finalidade as any) || 'comprar',
    prazo: null,
    pagamento: null,
    descricao_interesse: text,
    tipo_interesse: (extracted.tipo_interesse as any) || null,
    orcamento: extracted.orcamento || null,
    area_interesse: null,
    quartos_interesse: extracted.quartos || null,
    vagas_interesse: extracted.vagas || null,
    bairros_interesse: extracted.freguesia ? [extracted.freguesia] : null,
    corretor_id: corretorId || null,
    status: 'novo',
    criado_em: new Date().toISOString(),
  };

  const matchedImoveis = await recommendImoveis(syntheticLead, undefined, 3);
  const topImovel = matchedImoveis[0] || null;

  // Se for outro corretor buscando para cliente dele (parceria), cria em Oportunidades já com o imóvel vinculado
  if (extracted.classificacao === 'corretor_parceiro') {
    let parceiro = await parceiroRepo.findByTelefone(senderPhone, imobiliariaId);
    if (!parceiro) {
      parceiro = await parceiroRepo.create({
        imobiliaria_id: imobiliariaId,
        nome: senderName || `Corretor Parceiro #${senderPhone.slice(-4)}`,
        telefone: senderPhone,
        ativo: true,
        total_negocios: 0,
        notas: `Identificado no grupo "${groupName}".`,
      });
    }

    const titulo = topImovel
      ? `🎯 Você tem o imóvel! (${topImovel.referencia}) p/ ${parceiro.nome}`
      : `🤝 Busca de Parceiro (${groupName}): ${extracted.tipo_interesse || 'Imóvel'} ${extracted.freguesia || ''}`;

    const oport = await oportRepo.create({
      imobiliaria_id: imobiliariaId,
      parceiro_id: parceiro.id,
      corretor_id: corretorId || null,
      imovel_id: topImovel?.id || null,
      tipo: extracted.finalidade === 'alugar' ? 'parceria_locacao' : 'parceria_venda',
      titulo,
      descricao: `Grupo: ${groupName}\nCorretor Parceiro: ${parceiro.nome} (${senderPhone})\n${
        topImovel
          ? `🏠 Imóvel compatível na sua carteira: ${topImovel.titulo} (Ref: ${topImovel.referencia}) - R$ ${topImovel.valor.toLocaleString('pt-BR')}\n`
          : ''
      }\nBusca publicada:\n"${text}"`,
      status: 'nova',
      valor_estimado: topImovel?.valor || extracted.orcamento || null,
    });

    if (corretorPhone) {
      const matchLine = topImovel
        ? `\n\n🏠 *VOCÊ TEM ESSE IMÓVEL NA CARTEIRA:*\n• *${topImovel.titulo}* (Ref: *${topImovel.referencia}*) — R$ ${topImovel.valor.toLocaleString('pt-BR')}`
        : '';

      const alertMsg =
        `🎯 *RADAR DE GRUPO — PARCERIA DETECTADA!*\n\n` +
        `No grupo *${groupName}*, o corretor *${parceiro.nome}* (${senderPhone}) publicou uma busca:\n` +
        `_"${text.slice(0, 140)}${text.length > 140 ? '...' : ''}"_${matchLine}\n\n` +
        `Acesse *Oportunidades* para chamar o parceiro!`;

      await sendWhatsAppMessage(corretorPhone, alertMsg, instanceName, configPais);
    }

    return {
      handled: true,
      action: 'created_demand_partner_opportunity',
      matchedImovel: topImovel,
      oportunidadeId: oport.id,
    };
  }

  // Caso seja um cliente final perguntando no grupo, passa para o fluxo de Lead já com o imóvel compatível encontrado!
  return {
    handled: false,
    action: 'pass_to_lead_flow',
    matchedImovel: topImovel,
  };
}
