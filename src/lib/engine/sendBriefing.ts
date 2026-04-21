/**
 * Step 4 — Montar e Enviar Briefing (Build & Send WhatsApp Briefing)
 * 
 * Formats a complete briefing message and sends it to the assigned broker
 * via WhatsApp (Twilio).
 * 
 * v2: i18n support — currency, tipologia, and origem display adapted per country.
 */

import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { getConfig, formatCurrency, formatQuartos, getOrigemLabel } from '@/lib/countryConfig';
import type { Lead, Corretor } from '@/lib/database.types';
import type { ScoredImovel } from './recommendImoveis';

interface BriefingData {
  lead: Lead;
  corretor: Corretor;
  imoveis: ScoredImovel[];
  isExistingClient: boolean;
  corretorAnteriorNome?: string;
  config?: any; // Avoiding circular dependency if possible, or just using getConfigByCode
}

function formatWhatsAppLink(telefone: string): string {
  const cleaned = telefone.replace(/\D/g, '');
  return `https://wa.me/${cleaned}`;
}

/**
 * Builds the briefing message text with all required sections.
 */
export function buildBriefingMessage(data: BriefingData): string {
  const { lead, corretor, imoveis, isExistingClient, corretorAnteriorNome } = data;
  const config = data.config || getConfig();

  const lines: string[] = [];

  // Header
  lines.push(`🏠 *Novo lead para você — ${lead.nome}*`);
  lines.push('');

  // Origin badge (v2)
  if (lead.origem) {
    const origemInfo = getOrigemLabel(lead.origem);
    const portalSuffix = lead.portal_origem ? ` via ${lead.portal_origem}` : '';
    lines.push(`📌 *Origem:* ${origemInfo.icon} ${origemInfo.label}${portalSuffix}`);
    lines.push('');
  }

  // Contact info
  lines.push('📞 *Dados de contato:*');
  lines.push(`Nome: ${lead.nome}`);
  lines.push(`Telefone: ${lead.telefone}`);
  lines.push(`WhatsApp: ${formatWhatsAppLink(lead.telefone)}`);
  lines.push('');

  // Qualified profile
  lines.push('📋 *Perfil qualificado:*');
  if (lead.finalidade) {
    const finalidades: Record<string, string> = {
      comprar: 'Compra para morar',
      alugar: 'Aluguel',
      investir: 'Investimento',
    };
    lines.push(`Finalidade: ${finalidades[lead.finalidade] || lead.finalidade}`);
  }
  if (lead.prazo) lines.push(`Prazo: ${lead.prazo}`);
  if (lead.pagamento) lines.push(`Pagamento: ${lead.pagamento}`);
  if (lead.orcamento) lines.push(`Orçamento: ${formatCurrency(lead.orcamento, config)}`);
  lines.push('');

  // What the lead described
  lines.push('🔍 *Imóvel de interesse:*');
  if (lead.descricao_interesse) {
    lines.push(lead.descricao_interesse);
  } else {
    const parts: string[] = [];
    if (lead.tipo_interesse) parts.push(`Tipo: ${lead.tipo_interesse}`);
    if (lead.quartos_interesse) parts.push(formatQuartos(lead.quartos_interesse, config));
    if (lead.vagas_interesse) parts.push(`${lead.vagas_interesse} vagas`);
    if (lead.area_interesse) parts.push(`${lead.area_interesse}m²`);
    if (lead.bairros_interesse && lead.bairros_interesse.length > 0) {
      parts.push(`Bairros: ${lead.bairros_interesse.join(', ')}`);
    }
    lines.push(parts.join(' | ') || 'Não especificado');
  }
  lines.push('');

  // Recommended properties
  if (imoveis.length > 0) {
    lines.push(`🏡 *Sugestões de imóveis similares (${imoveis.length}):*`);
    imoveis.forEach((im, idx) => {
      lines.push('');
      lines.push(`*${idx + 1}. ${im.tipo.charAt(0).toUpperCase() + im.tipo.slice(1)} — ${im.freguesia}*`);
      lines.push(`   Valor: ${formatCurrency(im.valor, config)}`);
      if (im.area_util) lines.push(`   Área: ${im.area_util}m²`);
      if (im.quartos) lines.push(`   ${config.terminology.quartosLabel}: ${formatQuartos(im.quartos, config)}`);
      lines.push(`   Vagas: ${im.vagas_garagem}`);
      lines.push(`   Score: ${im.score} pts`);
    });
    lines.push('');
  } else {
    lines.push('🏡 *Sugestões:* Nenhum imóvel com match suficiente encontrado.');
    lines.push('');
  }

  // Client status
  if (isExistingClient) {
    lines.push(`⚠️ *Status:* Cliente existente — já atendido por ${corretorAnteriorNome || `${config.terminology.corretor.toLowerCase()} anterior`}`);
  } else {
    lines.push('✅ *Status:* Cliente novo');
  }

  lines.push('');
  lines.push(`_Atribuído para: ${corretor.nome}_`);

  return lines.join('\n');
}

/**
 * Sends the briefing to the assigned broker via WhatsApp.
 */
export async function sendBriefing(data: BriefingData): Promise<string> {
  const message = buildBriefingMessage(data);

  // Send to the broker's WhatsApp
  const to = data.corretor.telefone;
  const instanceName = data.corretor.whatsapp_instance || `realstate-iabroker-${data.corretor.id}`;
  
  const result = await sendWhatsAppMessage(to, message, instanceName);

  return result;
}
