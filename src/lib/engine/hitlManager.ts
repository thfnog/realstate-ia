/**
 * Human-In-The-Loop (HITL) Manager for Real Estate Operations
 * Inspired by Enterprise Assistant HITL Approval Integration
 * 
 * Allows AI agents to escalate high-risk or special actions to brokers via WhatsApp
 * with interactive approval tokens (e.g., "Aprovar 104", "Negar 104").
 */

import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export interface ApprovalRequest {
  id: string;
  imobiliaria_id: string;
  broker_id: string;
  broker_phone: string;
  lead_id: string;
  lead_phone: string;
  type: 'visit_special_time' | 'price_negotiation' | 'credit_approval' | 'custom';
  title: string;
  description: string;
  payload: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  created_at: string;
}

// In-memory cache for fast approval token resolution
const pendingApprovals = new Map<string, ApprovalRequest>();

export class HITLManager {
  /**
   * Generates a 4-digit approval code
   */
  private static generateToken(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Dispatches an approval request to the broker via WhatsApp
   */
  static async requestApproval(params: {
    imobiliaria_id: string;
    broker_id: string;
    broker_phone: string;
    lead_id: string;
    lead_phone: string;
    type: ApprovalRequest['type'];
    title: string;
    description: string;
    payload?: Record<string, any>;
    config_pais?: 'PT' | 'BR';
  }): Promise<ApprovalRequest> {
    const token = this.generateToken();
    const req: ApprovalRequest = {
      id: token,
      imobiliaria_id: params.imobiliaria_id,
      broker_id: params.broker_id,
      broker_phone: params.broker_phone,
      lead_id: params.lead_id,
      lead_phone: params.lead_phone,
      type: params.type,
      title: params.title,
      description: params.description,
      payload: params.payload || {},
      status: 'pending',
      created_at: new Date().toISOString()
    };

    pendingApprovals.set(token, req);

    const messageText = `🛡️ *SOLICITAÇÃO DE APROVAÇÃO (HITL)*\n\n*Título:* ${req.title}\n*Detalhes:* ${req.description}\n\nResponda diretamente com:\n👉 *Aprovar ${token}* para confirmar.\n👉 *Negar ${token}* para recusar.`;

    await sendWhatsAppMessage(params.broker_phone, messageText, undefined, params.config_pais);
    console.log(`🛡️ [HITLManager] Solicitação de aprovação #${token} enviada para corretor: ${params.broker_phone}`);

    return req;
  }

  /**
   * Checks if an incoming message from a broker is an approval/rejection command
   */
  static async checkAndProcessBrokerReply(
    senderPhone: string,
    messageText: string,
    config_pais: 'PT' | 'BR' = 'BR'
  ): Promise<{ handled: boolean; message?: string }> {
    const cleanText = messageText.trim().toLowerCase();
    const match = cleanText.match(/^(aprovar|negar|aceitar|recusar)\s+(\d{4})/i);

    if (!match) {
      return { handled: false };
    }

    const action = (match[1].startsWith('aprov') || match[1].startsWith('aceit')) ? 'approved' : 'rejected';
    const token = match[2];

    const req = pendingApprovals.get(token);
    if (!req) {
      return {
        handled: true,
        message: `⚠️ Solicitação #${token} não encontrada ou já expirada.`
      };
    }

    req.status = action;
    pendingApprovals.delete(token);

    console.log(`✅ [HITLManager] Solicitação #${token} marcada como: ${action.toUpperCase()}`);

    // Notify lead
    if (action === 'approved') {
      const leadMsg = `Ótima notícia! O corretor confirmou a sua solicitação referente a "${req.title}". Em breve entraremos em contato com mais detalhes! 🤝`;
      await sendWhatsAppMessage(req.lead_phone, leadMsg, undefined, config_pais);

      await sendWhatsAppMessage(
        senderPhone,
        `✅ *Aprovado com sucesso!* A solicitação #${token} foi confirmada e o cliente já foi notificado.`,
        undefined,
        config_pais
      );
    } else {
      const leadMsg = `Olá! O corretor analisou a solicitação de "${req.title}" e infelizmente não será possível atender neste momento. Gostaria de verificar outra opção ou horário?`;
      await sendWhatsAppMessage(req.lead_phone, leadMsg, undefined, config_pais);

      await sendWhatsAppMessage(
        senderPhone,
        `🚫 *Solicitação Negada.* O cliente foi informado educadamente.`,
        undefined,
        config_pais
      );
    }

    return { handled: true, message: `Ação ${action} processada com sucesso para #${token}.` };
  }
}
