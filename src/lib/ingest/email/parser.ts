/**
 * Lead Email Parser — Portugal
 * 
 * Extracts lead data from notification emails sent by PT portals:
 * - Idealista
 * - Imovirtual
 * - Casa SAPO
 */

import type { LeadFormData } from '@/lib/database.types';

export type PortalType = 'idealista' | 'imovirtual' | 'casasapo' | 'desconhecido';

export interface ParsedEmailLead extends Partial<LeadFormData> {
  portal: string;
}

/**
 * Identifies the portal based on email body content.
 */
export function detectPortal(body: string): PortalType {
  const content = body.toLowerCase();
  if (content.includes('idealista')) return 'idealista';
  if (content.includes('imovirtual')) return 'imovirtual';
  if (content.includes('casa sapo') || content.includes('casasapo')) return 'casasapo';
  return 'desconhecido';
}

/**
 * Main parsing logic for PT portals.
 */
export function parseEmailBody(body: string): ParsedEmailLead {
  const portal = detectPortal(body);
  
  const lead: ParsedEmailLead = {
    nome: 'Lead Portal',
    telefone: '',
    portal: portal === 'desconhecido' ? 'Portal Externo' : portal.charAt(0).toUpperCase() + portal.slice(1),
    origem: 'email_ego',
    moeda: 'EUR',
    finalidade: 'comprar', // Default for portal inquiries
  };

  // Helper to extract via Regex labels
  const extract = (regex: RegExp) => {
    const match = body.match(regex);
    return match ? match[1].trim() : null;
  };

  if (portal === 'idealista') {
    lead.nome = extract(/Nome:\s*(.*)/i) || lead.nome;
    lead.telefone = extract(/Telefone:\s*(.*)/i) || '';
    const msg = extract(/Mensagem:\s*([\s\S]*?)(?=\n[a-z]+:|$)/i);
    if (msg) lead.descricao_interesse = msg;
  } 
  else if (portal === 'imovirtual') {
    lead.nome = extract(/Nome:\s*(.*)/i) || lead.nome;
    lead.telefone = extract(/Telemóvel:\s*(.*)/i) || extract(/Telefone:\s*(.*)/i) || '';
    const ref = extract(/Referência do anúncio:\s*(.*)/i);
    if (ref) lead.descricao_interesse = `Referência Portais: ${ref}`;
  }
  else if (portal === 'casasapo') {
    lead.nome = extract(/Nome:\s*(.*)/i) || lead.nome;
    lead.telefone = extract(/Contacto:\s*(.*)/i) || '';
  }
  else {
    // Generic fallback for any portal
    lead.nome = extract(/Nome:\s*(.*)/i) || lead.nome;
    lead.telefone = extract(/Telefone:\s*(.*)/i) || extract(/Telemóvel:\s*(.*)/i) || extract(/Contacto:\s*(.*)/i) || '';
  }

  // Final cleanup of phone (remove spaces)
  if (lead.telefone) {
    lead.telefone = lead.telefone.replace(/\s/g, '');
    if (!lead.telefone.startsWith('+')) {
      // Assume PT if it starts with 9
      if (lead.telefone.startsWith('9')) lead.telefone = `+351${lead.telefone}`;
    }
  }

  return lead;
}
