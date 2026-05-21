/**
 * Mock Recommendation Engine — Uses in-memory properties
 *
 * Matches the format of the real recommendation engine: top 5 results,
 * match percentages, and structured match reasons.
 */

import * as mock from '@/lib/mockDb';
import { formatCurrency, getConfig } from '@/lib/countryConfig';
import type { Lead } from '@/lib/database.types';
import type { ScoredImovel } from './recommendImoveis';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://realstate-ia.vercel.app').replace(/\/$/, '');

export function recommendImovelsMock(lead: Lead, configIn?: any, maxResults: number = 5): ScoredImovel[] {
  const config = configIn || getConfig();
  let imoveis = mock.getImoveis({ status: 'disponivel' });

  // Filter by compatible currency
  imoveis = imoveis.filter((i) => i.moeda === lead.moeda);

  if (!imoveis || imoveis.length === 0) {
    console.log('⚠️ Nenhum imóvel disponível para recomendação');
    return [];
  }

  // Calculate dynamic maximum possible score based on criteria defined by the lead
  let maxPossibleScore = 0;
  if (lead.tipo_interesse) maxPossibleScore += 5;
  if (lead.quartos_interesse) maxPossibleScore += 4;
  if (lead.orcamento) maxPossibleScore += 4;
  if (lead.area_interesse) maxPossibleScore += 2;
  if (lead.bairros_interesse && lead.bairros_interesse.length > 0) maxPossibleScore += 3;
  if (lead.vagas_interesse) maxPossibleScore += 1;

  if (maxPossibleScore === 0) maxPossibleScore = 15; // default fallback

  const scored: ScoredImovel[] = imoveis.map((imovel) => {
    let score = 0;
    const breakdown: string[] = [];
    const reasons: string[] = [];

    // Finalidade Match (Mandatory)
    if (lead.finalidade) {
      const isBuy = lead.finalidade === 'comprar' || lead.finalidade === 'investir';
      const isRent = lead.finalidade === 'alugar';
      
      const imobFinalidade = imovel.finalidade?.toLowerCase() || '';
      
      if (isBuy && (imobFinalidade === 'arrendamento' || imobFinalidade === 'aluguel')) return null;
      if (isRent && imobFinalidade === 'venda') return null;
    }

    // Tipo match (+5 exact, +3 affinity)
    if (lead.tipo_interesse) {
      if (imovel.tipo === lead.tipo_interesse) {
        score += 5;
        breakdown.push(`Tipo ${imovel.tipo}: +5`);
        reasons.push(`Tipo de imóvel ideal (${imovel.tipo})`);
      } else {
        const ruralTypes = ['chacara', 'sitio', 'fazenda'];
        const landTypes = ['terreno', 'lote'];
        const isRuralAffinity = ruralTypes.includes(lead.tipo_interesse) && ruralTypes.includes(imovel.tipo || '');
        const isLandAffinity = landTypes.includes(lead.tipo_interesse) && landTypes.includes(imovel.tipo || '');
        
        if (isRuralAffinity || isLandAffinity) {
          score += 3;
          breakdown.push(`Afinidade ${imovel.tipo} vs ${lead.tipo_interesse}: +3`);
          reasons.push(`Estilo do imóvel (${imovel.tipo}) atende sua busca por ${lead.tipo_interesse}`);
        }
      }
    }

    // Quartos match (+4 exact, +2 if ±1)
    if (lead.quartos_interesse && imovel.quartos !== null) {
      if (imovel.quartos === lead.quartos_interesse) {
        score += 4;
        breakdown.push(`Quartos ${imovel.quartos}: +4`);
        reasons.push(`Possui exatamente ${imovel.quartos} quarto(s) como desejado`);
      } else if (Math.abs(imovel.quartos - lead.quartos_interesse) === 1) {
        score += 2;
        breakdown.push(`Quartos ${imovel.quartos} (±1): +2`);
        reasons.push(`Possui ${imovel.quartos} quarto(s), bem próximo da sua busca`);
      }
    }

    // Valor within ±15% of budget (+4) or ±25% (+2)
    if (lead.orcamento && imovel.valor) {
      const diff = Math.abs(imovel.valor - lead.orcamento) / lead.orcamento;
      if (diff <= 0.15) {
        score += 4;
        breakdown.push(`Valor ${formatCurrency(imovel.valor, config)} (±15%): +4`);
        reasons.push(`Preço dentro do orçamento (${formatCurrency(imovel.valor, config)})`);
      } else if (diff <= 0.25) {
        score += 2;
        breakdown.push(`Valor ${formatCurrency(imovel.valor, config)} (±25%): +2`);
        reasons.push(`Preço de ${formatCurrency(imovel.valor, config)} está ligeiramente fora da estimativa`);
      }
    }

    // Área within ±20% (+2)
    if (lead.area_interesse && imovel.area_util) {
      const minArea = lead.area_interesse * 0.80;
      const maxArea = lead.area_interesse * 1.20;
      if (imovel.area_util >= minArea && imovel.area_util <= maxArea) {
        score += 2;
        breakdown.push(`Área ${imovel.area_util}m² (±20%): +2`);
        reasons.push(`Tamanho do imóvel (${imovel.area_util}m²) adequado para seu perfil`);
      }
    }

    // Bairro match (+3) — fuzzy matching
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
          reasons.push(`Excelente localização no bairro/freguesia ${imovel.freguesia}`);
        }
      }
    }

    // Vagas match (+1)
    if (lead.vagas_interesse && imovel.vagas_garagem === lead.vagas_interesse) {
      score += 1;
      breakdown.push(`Vagas ${imovel.vagas_garagem}: +1`);
      reasons.push(`Possui ${imovel.vagas_garagem} vaga(s) de garagem`);
    }

    const match_percentage = Math.round(Math.min((score / maxPossibleScore) * 100, 100));

    return {
      ...imovel,
      score,
      scoreBreakdown: breakdown,
      publicUrl: `${APP_URL}/imoveis/${imovel.id}`,
      match_percentage,
      match_reasons: reasons
    } as ScoredImovel;
  }).filter((i): i is ScoredImovel => i !== null);

  const recommended = scored
    .filter((i) => i.score >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return recommended;
}
