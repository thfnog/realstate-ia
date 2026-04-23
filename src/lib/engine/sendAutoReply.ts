/**
 * Step 5 — Enviar Resposta Automática ao Lead (Auto-Reply to Lead)
 * 
 * Envia uma mensagem personalizada e humana em primeira pessoa 
 * logo após o lead ser processado.
 */

import { sendWhatsAppMessage, saveMessageToHistory } from '@/lib/whatsapp';
import type { Lead, Corretor } from '@/lib/database.types';

interface AutoReplyData {
  lead: Lead;
  corretor: Corretor;
  config: any;
  customMessage?: string;
  useDefaultInstance?: boolean;
}

/**
 * Monta a mensagem personalizada em primeira pessoa.
 */
export function buildAutoReplyMessage(data: AutoReplyData): string {
  const { lead, corretor, config } = data;
  const isBR = config.code === 'BR';

  // Protect against pending/null names
  const isNamePending = !lead.nome || lead.nome.startsWith('Lead #');
  const greeting = isNamePending ? 'Olá' : `Oi ${lead.nome}`;
  const greetingPT = isNamePending ? 'Olá' : `Olá ${lead.nome}`;

  // Extrair local de interesse (bairro ou região)
  const local = lead.bairros_interesse && lead.bairros_interesse.length > 0 
    ? lead.bairros_interesse[0] 
    : (lead.tipo_interesse || 'imóvel');

  if (isBR) {
    return `${greeting}, aqui é o ${corretor.nome}! Recebi seu interesse no ${local} e já comecei a olhar aqui. Te chamo em breve para conversarmos melhor, combinado? Um abraço!`;
  } else {
    // Portugal Style
    return `${greetingPT}, fala o ${corretor.nome}! Recebi o seu contacto sobre o imóvel em ${local}. Vou analisar os detalhes e ligo-lhe já de seguida. Até já!`;
  }
}

/**
 * Envia a saudação automática para o Lead.
 */
export async function sendAutoReplyToLead(data: AutoReplyData): Promise<string> {
  const { lead, customMessage } = data;
  const message = customMessage || buildAutoReplyMessage(data);

  // Choose instance: default (company) or broker's personal
  const instanceName = data.useDefaultInstance
    ? (process.env.WHATSAPP_DEFAULT_INSTANCE || '').trim().replace(/[\r\n]/g, '')
    : (data.corretor.whatsapp_instance || `realstate-iabroker-${data.corretor.id}`);
  
  try {
    const result = await sendWhatsAppMessage(lead.telefone, message, instanceName, data.config?.code);
    
    // Persist outbound bot message
    await saveMessageToHistory({
      imobiliaria_id: lead.imobiliaria_id,
      lead_id: lead.id,
      corretor_id: data.corretor.id,
      direction: 'outbound',
      message_text: message,
      status: 'sent',
      provider_id: result
    });

    return result;
  } catch (error) {
    console.error(`⚠️ Falha ao enviar WhatsApp para o lead ${lead.nome}. O corretor ${data.corretor.nome} pode estar desconectado.`);
    throw error;
  }
}
