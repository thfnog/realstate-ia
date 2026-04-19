/**
 * Step 5 — Enviar Resposta Automática ao Lead (Auto-Reply to Lead)
 * 
 * Envia uma mensagem personalizada e humana em primeira pessoa 
 * logo após o lead ser processado.
 */

import { sendWhatsAppMessage } from '@/lib/whatsapp';
import type { Lead, Corretor } from '@/lib/database.types';

interface AutoReplyData {
  lead: Lead;
  corretor: Corretor;
  config: any;
}

/**
 * Monta a mensagem personalizada em primeira pessoa.
 */
export function buildAutoReplyMessage(data: AutoReplyData): string {
  const { lead, corretor, config } = data;
  const isBR = config.code === 'BR';

  // Extrair local de interesse (bairro ou região)
  const local = lead.bairros_interesse && lead.bairros_interesse.length > 0 
    ? lead.bairros_interesse[0] 
    : (lead.tipo_interesse || 'imóvel');

  if (isBR) {
    return `Oi ${lead.nome}, aqui é o ${corretor.nome}! Recebi seu interesse no ${local} e já comecei a olhar aqui. Te chamo em breve para conversarmos melhor, combinado? Um abraço!`;
  } else {
    // Portugal Style
    return `Olá ${lead.nome}, fala o ${corretor.nome}! Recebi o seu contacto sobre o imóvel em ${local}. Vou analisar os detalhes e ligo-lhe já de seguida. Até já!`;
  }
}

/**
 * Envia a saudação automática para o Lead.
 */
export async function sendAutoReplyToLead(data: AutoReplyData): Promise<string> {
  const { lead } = data;
  const message = buildAutoReplyMessage(data);

  // Enviar para o WhatsApp do Lead
  const result = await sendWhatsAppMessage(lead.telefone, message);

  return result;
}
