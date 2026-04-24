/**
 * Step 3 — Motor de Recomendação de Imóveis (Property Recommendation Engine)
 * 
 * Scores all available properties against the lead's profile.
 * 
 * Scoring algorithm:
 * - Tipo match:           +5 points
 * - Quartos match:        +4 points
 * - Valor ±15%:           +4 points
 * - Área ±20%:            +2 points
 * - Bairro match:         +3 points
 * - Vagas match:          +1 point
 * 
 * Returns top 3 properties with minimum 5 points.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { formatCurrency, getConfig } from '@/lib/countryConfig';
import type { Imovel, Lead } from '@/lib/database.types';

export type ScoredImovel = Imovel & {
  score: number;
  scoreBreakdown: string[];
};

export async function recommendImoveis(lead: Lead, configIn?: any): Promise<ScoredImovel[]> {
  const config = configIn || getConfig();
  // Fetch all available properties
  const { data: imoveis, error } = await supabaseAdmin
    .from('imoveis')
    .select('*')
    .eq('status', 'disponivel');

  if (error) {
    console.error('Erro ao buscar imóveis:', error);
    return [];
  }

  if (!imoveis || imoveis.length === 0) {
    console.log('⚠️ Nenhum imóvel disponível para recomendação');
    return [];
  }

  // Score each property
  const scored: ScoredImovel[] = imoveis.map((imovel) => {
    let score = 0;
    const breakdown: string[] = [];

    // 0. Finalidade Match (Mandatory)
    if (lead.finalidade && imovel.finalidade !== 'ambos') {
      const isBuy = lead.finalidade === 'comprar' || lead.finalidade === 'investir';
      const isRent = lead.finalidade === 'alugar';
      
      if (isBuy && imovel.finalidade === 'arrendamento') return null;
      if (isRent && imovel.finalidade === 'venda') return null;
    }

    // 1. Tipo match (+5)
    if (lead.tipo_interesse && imovel.tipo === lead.tipo_interesse) {
      score += 5;
      breakdown.push(`Tipo ${imovel.tipo}: +5`);
    }

    // 2. Quartos match (+4 exact, +2 if ±1)
    if (lead.quartos_interesse && imovel.quartos !== null) {
      if (imovel.quartos === lead.quartos_interesse) {
        score += 4;
        breakdown.push(`Quartos ${imovel.quartos}: +4`);
      } else if (Math.abs(imovel.quartos - lead.quartos_interesse) === 1) {
        score += 2;
        breakdown.push(`Quartos ${imovel.quartos} (±1): +2`);
      }
    }

    // 3. Valor within ±15% of budget (+4) or ±25% (+2)
    if (lead.orcamento && imovel.valor) {
      const diff = Math.abs(imovel.valor - lead.orcamento) / lead.orcamento;
      if (diff <= 0.15) {
        score += 4;
        breakdown.push(`Valor ${formatCurrency(imovel.valor, config)} (±15%): +4`);
      } else if (diff <= 0.25) {
        score += 2;
        breakdown.push(`Valor ${formatCurrency(imovel.valor, config)} (±25%): +2`);
      }
    }

    // 4. Área within ±20% (+2)
    if (lead.area_interesse && imovel.area_util) {
      const minArea = lead.area_interesse * 0.80;
      const maxArea = lead.area_interesse * 1.20;
      if (imovel.area_util >= minArea && imovel.area_util <= maxArea) {
        score += 2;
        breakdown.push(`Área ${imovel.area_util}m² (±20%): +2`);
      }
    }

    // 5. Bairro match (+3) — fuzzy matching
    if (lead.bairros_interesse && lead.bairros_interesse.length > 0) {
      const { findBestMatch } = require('string-similarity');
      const bairroNorm = (imovel.freguesia || '').toLowerCase().trim();
      const interests = lead.bairros_interesse.map(b => b.toLowerCase().trim());
      
      if (bairroNorm) {
        const { bestMatch } = findBestMatch(bairroNorm, interests);
        const isPartial = interests.some(b => bairroNorm.includes(b) || b.includes(bairroNorm));
        
        if (isPartial || bestMatch.rating > 0.6) {
          score += 3;
          const ratingPercent = (bestMatch.rating * 100).toFixed(0);
          breakdown.push(`Bairro ${imovel.freguesia} (${isPartial ? '100' : ratingPercent}% match): +3`);
        }
      }
    }

    // 6. Vagas match (+1)
    if (lead.vagas_interesse && imovel.vagas_garagem === lead.vagas_interesse) {
      score += 1;
      breakdown.push(`Vagas ${imovel.vagas_garagem}: +1`);
    }

    return {
      ...imovel,
      score,
      scoreBreakdown: breakdown,
    } as ScoredImovel;
  }).filter((i): i is ScoredImovel => i !== null);

  // Filter minimum 5 points, sort descending, return top 3
  const recommended = scored
    .filter((i) => i.score >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  console.log(`🏠 ${recommended.length} imóveis recomendados (de ${imoveis.length} disponíveis)`);
  recommended.forEach((r) => {
    console.log(`  - ${r.tipo} em ${r.freguesia}: ${r.score} pts [${r.scoreBreakdown.join(', ')}]`);
  });

  return recommended;
}
