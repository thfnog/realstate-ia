/**
 * Email Parser — eGO notification parser (Portugal)
 *
 * In production, this would connect to an IMAP mailbox and parse
 * incoming eGO email notifications. For now, it provides a mock
 * implementation that simulates parsing emails.
 *
 * eGO sends notifications like:
 *   Subject: "Novo contacto - Idealista - Ref. 1234"
 *   Body contains: Nome, Telefone, Email, Portal, Referência do imóvel
 */

import type { Lead, LeadSource, Moeda } from '@/lib/database.types';

export interface ParsedEmailLead {
  nome: string;
  telefone: string;
  email?: string;
  portal_origem: string;
  referencia_imovel?: string;
  mensagem?: string;
}

export interface EmailParseResult {
  processed: number;
  leads: ParsedEmailLead[];
  errors: string[];
}

/**
 * Mock email patterns that simulate eGO notification parsing.
 * In production, these would be regex patterns applied to actual emails.
 */
const EGO_PORTALS = ['Idealista', 'Imovirtual', 'Casa Sapo', 'ERA', 'Remax'];

/**
 * Parses eGO notification emails from an IMAP mailbox.
 *
 * In production: connects to IMAP, reads unread emails, extracts lead data.
 * In mock mode: returns simulated parsed leads for testing.
 */
export async function parseIncomingEmails(options?: { test?: boolean }): Promise<EmailParseResult> {
  const imapHost = process.env.EMAIL_IMAP_HOST;
  const imapUser = process.env.EMAIL_IMAP_USER;
  const imapPass = process.env.EMAIL_IMAP_PASSWORD;

  // If no IMAP credentials or test mode, return mock data
  if (!imapHost || !imapUser || !imapPass || options?.test) {
    console.log('📧 [MOCK] Simulando parse de e-mails eGO...');

    const mockLeads: ParsedEmailLead[] = [
      {
        nome: 'António Mendes',
        telefone: '+351 918 765 432',
        email: 'antonio.mendes@email.pt',
        portal_origem: 'Idealista',
        referencia_imovel: 'REF-2024-001',
        mensagem: 'Gostaria de agendar visita ao T2 em Chiado',
      },
      {
        nome: 'Clara Vieira',
        telefone: '+351 926 543 210',
        email: 'clara.v@email.pt',
        portal_origem: 'Imovirtual',
        referencia_imovel: 'REF-2024-015',
        mensagem: 'Tenho interesse neste imóvel. Qual a disponibilidade?',
      },
    ];

    return {
      processed: mockLeads.length,
      leads: mockLeads,
      errors: [],
    };
  }

  // === Production IMAP integration would go here ===
  // Using imapflow library:
  //
  // const client = new ImapFlow({
  //   host: imapHost,
  //   port: parseInt(process.env.EMAIL_IMAP_PORT || '993'),
  //   secure: true,
  //   auth: { user: imapUser, pass: imapPass },
  // });
  //
  // await client.connect();
  // const lock = await client.getMailboxLock('INBOX');
  // ... fetch unseen messages, parse with regex, mark as seen ...
  // lock.release();
  // await client.logout();

  return { processed: 0, leads: [], errors: ['IMAP integration not yet implemented'] };
}

/**
 * Converts a parsed email lead into the internal Lead creation format.
 */
export function emailLeadToCreateData(parsed: ParsedEmailLead): Omit<Lead, 'id' | 'criado_em'> {
  return {
    nome: parsed.nome,
    telefone: parsed.telefone.replace(/\s/g, ''),
    origem: 'email_ego' as LeadSource,
    portal_origem: parsed.portal_origem,
    moeda: 'EUR' as Moeda,
    finalidade: null,
    prazo: null,
    pagamento: null,
    descricao_interesse: parsed.mensagem || null,
    tipo_interesse: null,
    orcamento: null,
    area_interesse: null,
    quartos_interesse: null,
    vagas_interesse: null,
    bairros_interesse: null,
    corretor_id: null,
    status: 'novo',
  };
}
