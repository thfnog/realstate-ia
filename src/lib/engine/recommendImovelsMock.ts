/**
 * Mock Recommendation Engine — Uses in-memory properties
 *
 * v2: Filters by compatible currency (EUR vs BRL) to avoid cross-country mismatches.
 */

import * as mock from '@/lib/mockDb';
import { formatCurrency, getConfig } from '@/lib/countryConfig';
import type { Lead } from '@/lib/database.types';
import type { ScoredImovel } from './recommendImoveis';

export function recommendImovelsMock(lead: Lead, configIn?: any): ScoredImovel[] {
  const config = configIn || getConfig();
  let imoveis = mock.getImoveis('disponivel');

  // v2: Filter by compatible currency
  imoveis = imoveis.filter((i) => i.moeda === lead.moeda);

  if (!imoveis || imoveis.length === 0) {
    console.log('⚠️ Nenhum imóvel disponível para recomendação');
    return [];
  }

  const scored: ScoredImovel[] = imoveis.map((imovel) => {
    let score = 0;
    const breakdown: string[] = [];

    if (lead.tipo_interesse && imovel.tipo === lead.tipo_interesse) {
      score += 5;
      breakdown.push(`Tipo ${imovel.tipo}: +5`);
    }

    if (lead.quartos_interesse && imovel.quartos === lead.quartos_interesse) {
      score += 4;
      breakdown.push(`${config.terminology.quartosLabel} ${imovel.quartos}: +4`);
    }

    if (lead.orcamento && imovel.valor) {
      const minVal = lead.orcamento * 0.85;
      const maxVal = lead.orcamento * 1.15;
      if (imovel.valor >= minVal && imovel.valor <= maxVal) {
        score += 4;
        breakdown.push(`Valor ${formatCurrency(imovel.valor, config)} (±15%): +4`);
      }
    }

    if (lead.area_interesse && imovel.area_util) {
      const minArea = lead.area_interesse * 0.80;
      const maxArea = lead.area_interesse * 1.20;
      if (imovel.area_util >= minArea && imovel.area_util <= maxArea) {
        score += 2;
        breakdown.push(`Área ${imovel.area_util}m² (±20%): +2`);
      }
    }

    if (lead.bairros_interesse && lead.bairros_interesse.length > 0) {
      const bairroNorm = imovel.freguesia.toLowerCase().trim();
      const match = lead.bairros_interesse.some(
        (b) => bairroNorm.includes(b.toLowerCase().trim()) || b.toLowerCase().trim().includes(bairroNorm)
      );
      if (match) {
        score += 3;
        breakdown.push(`Bairro ${imovel.freguesia}: +3`);
      }
    }

    if (lead.vagas_interesse && imovel.vagas_garagem === lead.vagas_interesse) {
      score += 1;
      breakdown.push(`Vagas ${imovel.vagas_garagem}: +1`);
    }

    return { ...imovel, score, scoreBreakdown: breakdown } as ScoredImovel;
  });

  const recommended = scored
    .filter((i) => i.score >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  console.log(`🏠 ${recommended.length} imóveis recomendados (de ${imoveis.length} disponíveis, moeda: ${lead.moeda})`);
  recommended.forEach((r) => {
    console.log(`  - ${r.tipo} em ${r.freguesia}: ${r.score} pts [${r.scoreBreakdown.join(', ')}]`);
  });

  return recommended;
}
