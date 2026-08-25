/**
 * Real Estate JIT (Just-In-Time) Retriever
 * Inspired by Enterprise Assistant Context Engine JIT Slicing
 * 
 * Performs high-precision, token-budgeted knowledge retrieval based on user query tokens.
 * Injects only the exact relevant slice of the RealEstateGraph into the prompt context.
 */

import { RealEstateGraph, PropertyGraphNode, AgencyPolicyNode } from './realEstateGraph';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import type { Imovel } from '@/lib/database.types';

export interface JITRetrievalResult {
  retrievedSnippet: string;
  entitiesDetected: string[];
  tokensEstimated: number;
}

export class JITRetriever {
  /**
   * Fast token estimator (~1.35 tokens per word)
   */
  private static estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.trim().split(/\s+/).length * 1.35);
  }

  /**
   * Extracts Just-In-Time real estate context from user query and active conversation state
   */
  static async retrieveJITContext(params: {
    userText: string;
    imobiliariaId: string;
    targetPropertyRef?: string | null;
    targetPropertyId?: string | null;
  }): Promise<JITRetrievalResult> {
    const { userText, imobiliariaId, targetPropertyRef, targetPropertyId } = params;
    const lowerQuery = userText.toLowerCase();
    const entitiesDetected: string[] = [];
    const snippets: string[] = [];

    // 1. Detect Property Reference in Query
    const refMatch = lowerQuery.match(/\b([a-z]{2,4}-?\d{2,5})\b/i);
    const candidateRef = refMatch ? refMatch[1].toUpperCase().replace('-', '') : targetPropertyRef;

    if (candidateRef || targetPropertyId) {
      let imovel: Imovel | null = null;

      if (mock.isMockMode()) {
        imovel = candidateRef ? (mock.getImovelByReferencia(candidateRef) || null) : null;
        if (!imovel && targetPropertyId) imovel = mock.getImovelById(targetPropertyId) || null;
      } else {
        const query = supabaseAdmin.from('imoveis').select('*').eq('imobiliaria_id', imobiliariaId);
        if (candidateRef) {
          const { data } = await query.ilike('referencia', candidateRef).maybeSingle();
          imovel = data;
        } else if (targetPropertyId) {
          const { data } = await query.eq('id', targetPropertyId).maybeSingle();
          imovel = data;
        }
      }

      if (imovel) {
        entitiesDetected.push(`imovel:${imovel.referencia}`);
        const node = RealEstateGraph.buildPropertyNode(imovel);

        const propertySnippet = `
📌 [JIT Imóvel Ref: ${node.referencia}]
- Tipo: ${node.tipo} (${node.finalidade}) | Valor: R$ ${node.valor.toLocaleString('pt-BR')} ${node.valor_locacao ? `(Locação: R$ ${node.valor_locacao})` : ''}
- Condomínio: ${node.condominio_mensal ? `R$ ${node.condominio_mensal}` : 'Isento'} | IPTU: ${node.iptu_anual ? `R$ ${node.iptu_anual}/ano` : 'Incluso/Isento'}
- Endereço: ${node.endereco}
- Regras: Aceita Pet: ${node.regras.aceita_pet ? 'Sim' : 'Não'} | Portaria 24h: ${node.regras.portaria_24h ? 'Sim' : 'Não'} | Elevador: ${node.regras.elevador ? 'Sim' : 'Não'} | Vagas: ${node.vagas} (${node.regras.vaga_demarcada ? 'demarcada' : 'rotativa'})
- Comodidades: ${node.comodidades.join(', ') || 'Padrão'}`.trim();

        snippets.push(propertySnippet);
      }
    }

    // 2. Detect Agency Policy Queries (Guarantees, Documents, Visits, Pets)
    const policies = RealEstateGraph.getPolicies();
    for (const policy of policies) {
      const isMatched = policy.palavras_chave.some(kw => lowerQuery.includes(kw));
      if (isMatched) {
        entitiesDetected.push(`policy:${policy.id}`);
        snippets.push(`📋 [JIT Política: ${policy.titulo}]\n${policy.conteudo}`);
      }
    }

    const fullSnippet = snippets.join('\n\n');

    return {
      retrievedSnippet: fullSnippet,
      entitiesDetected,
      tokensEstimated: this.estimateTokens(fullSnippet)
    };
  }
}
