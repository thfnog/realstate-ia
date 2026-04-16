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
import type { Imovel, Lead } from '@/lib/database.types';

export type ScoredImovel = Imovel & {
  score: number;
  scoreBreakdown: string[];
};

export async function recommendImoveis(lead: Lead): Promise<ScoredImovel[]> {
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

    // 1. Tipo match (+5)
    if (lead.tipo_interesse && imovel.tipo === lead.tipo_interesse) {
      score += 5;
      breakdown.push(`Tipo ${imovel.tipo}: +5`);
    }

    // 2. Quartos match (+4)
    if (lead.quartos_interesse && imovel.quartos === lead.quartos_interesse) {
      score += 4;
      breakdown.push(`Quartos ${imovel.quartos}: +4`);
    }

    // 3. Valor within ±15% of budget (+4)
    if (lead.orcamento && imovel.valor) {
      const minVal = lead.orcamento * 0.85;
      const maxVal = lead.orcamento * 1.15;
      if (imovel.valor >= minVal && imovel.valor <= maxVal) {
        score += 4;
        breakdown.push(`Valor R$${imovel.valor.toLocaleString('pt-BR')} (dentro de ±15%): +4`);
      }
    }

    // 4. Área within ±20% (+2)
    if (lead.area_interesse && imovel.area_m2) {
      const minArea = lead.area_interesse * 0.80;
      const maxArea = lead.area_interesse * 1.20;
      if (imovel.area_m2 >= minArea && imovel.area_m2 <= maxArea) {
        score += 2;
        breakdown.push(`Área ${imovel.area_m2}m² (dentro de ±20%): +2`);
      }
    }

    // 5. Bairro match (+3)
    if (lead.bairros_interesse && lead.bairros_interesse.length > 0) {
      const bairroNorm = imovel.bairro.toLowerCase().trim();
      const match = lead.bairros_interesse.some(
        (b) => b.toLowerCase().trim() === bairroNorm
      );
      if (match) {
        score += 3;
        breakdown.push(`Bairro ${imovel.bairro}: +3`);
      }
    }

    // 6. Vagas match (+1)
    if (lead.vagas_interesse && imovel.vagas === lead.vagas_interesse) {
      score += 1;
      breakdown.push(`Vagas ${imovel.vagas}: +1`);
    }

    return {
      ...imovel,
      score,
      scoreBreakdown: breakdown,
    } as ScoredImovel;
  });

  // Filter minimum 5 points, sort descending, return top 3
  const recommended = scored
    .filter((i) => i.score >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  console.log(`🏠 ${recommended.length} imóveis recomendados (de ${imoveis.length} disponíveis)`);
  recommended.forEach((r) => {
    console.log(`  - ${r.tipo} em ${r.bairro}: ${r.score} pts [${r.scoreBreakdown.join(', ')}]`);
  });

  return recommended;
}
