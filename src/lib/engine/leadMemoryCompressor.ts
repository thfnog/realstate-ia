/**
 * Lead Journey Memory Compressor
 * Inspired by Enterprise Assistant Continuous Memory Service
 * 
 * Condenses extended multi-turn dialog history into a continuous 2-line memory hook
 * ensuring no critical customer constraints (pets, family, financing, preferences)
 * are lost when older turns are truncated.
 */

import { callAIWithFallback, parseSafeJSON } from './aiUtils';
import { ModelRouter } from './modelRouter';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';

export class LeadMemoryCompressor {
  private static memoryCache = new Map<string, string>();

  /**
   * Generates or updates the 2-line memory hook for a lead
   */
  static async compressLeadMemory(
    leadId: string,
    history: Array<{ direction: 'inbound' | 'outbound'; message_text: string }>,
    currentMemory?: string
  ): Promise<string> {
    if (!history || history.length < 4) {
      return currentMemory || '';
    }

    const cached = this.memoryCache.get(leadId);
    if (cached && history.length < 8) {
      return cached;
    }

    try {
      const historyText = history
        .map(h => `${h.direction === 'inbound' ? 'Cliente' : 'Corretor'}: ${h.message_text}`)
        .join('\n');

      const systemPrompt = `Você é um compressor de memória de CRM imobiliário.
Seu objetivo é resumir o histórico da conversa com o cliente em exatamente 2 ou 3 frases concisas destacando:
1. Preferências essenciais (tipo de imóvel, bairros, orçamento, quartos, vagas).
2. Restrições e detalhes pessoais críticos (pets, família, financiamento/à vista, motivo da mudança).
3. Status atual da negociação (ex: viu imóvel X, quer agendar visita).

Responda APENAS em texto puro, direto ao ponto, sem introduções.`;

      const route = ModelRouter.getRoute('extraction');
      const response = await callAIWithFallback({
        model: route.primaryModel,
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Histórico recente da conversa:\n${historyText}` }
        ]
      });

      const choice = response.choices?.[0];
      const summary = choice?.message?.content?.trim() || '';

      if (summary) {
        this.memoryCache.set(leadId, summary);
        return summary;
      }

      return currentMemory || '';
    } catch (e) {
      console.warn('⚠️ [LeadMemoryCompressor] Falha ao comprimir memória (usando anterior):', e);
      return currentMemory || '';
    }
  }

  /**
   * Retrieves cached memory hook for a lead
   */
  static getCachedMemory(leadId: string): string | undefined {
    return this.memoryCache.get(leadId);
  }
}
