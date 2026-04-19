/**
 * Inteligência de Extração — Natural Language to Lead
 * 
 * Este módulo simula o que um LLM faria: ler o texto livre do WhatsApp
 * e extrair os parâmetros técnicos para o motor de busca de imóveis.
 */

import { Lead } from '@/lib/database.types';

export interface ExtractedLeadProfile {
  nome?: string;
  tipo_interesse?: 'apartamento' | 'casa' | 'terreno';
  freguesia?: string; // Bairro
  concelho?: string;  // Cidade
  orcamento?: number;
  quartos?: number;
}

export function extractLeadFromText(text: string): ExtractedLeadProfile {
  const normalized = text.toLowerCase();
  
  const profile: ExtractedLeadProfile = {};

  // 1. Extração de Tipo
  if (normalized.includes('apartamento') || normalized.includes('apto') || normalized.includes(' ap ')) {
    profile.tipo_interesse = 'apartamento';
  } else if (normalized.includes('casa') || normalized.includes('sobrado') || normalized.includes('vilas')) {
    profile.tipo_interesse = 'casa';
  } else if (normalized.includes('lote') || normalized.includes('terreno')) {
    profile.tipo_interesse = 'terreno';
  }

  // 2. Extração de Localização (Indaiatuba focus)
  if (normalized.includes('indaiatuba')) profile.concelho = 'Indaiatuba';
  
  // Bairros comuns em Indaiatuba
  const bairros = ['swiss park', 'helvetia', 'itaici', 'jardins', 'centro', 'pau preto', 'brescia', 'vitoria regia'];
  for (const b of bairros) {
    if (normalized.includes(b)) {
      profile.freguesia = b.charAt(0).toUpperCase() + b.slice(1);
      break;
    }
  }

  // 3. Extração de Orçamento (Ex: 1.5 milhão, 800 mil, 500k)
  const budgetMatch = normalized.match(/(\d+[.,]?\d*)\s*(milhão|milhões|m|mil|k)/);
  if (budgetMatch) {
    let val = parseFloat(budgetMatch[1].replace(',', '.'));
    const unit = budgetMatch[2];
    
    if (unit.startsWith('m') && unit !== 'mil') {
      val = val * 1000000;
    } else if (unit === 'mil' || unit === 'k') {
      val = val * 1000;
    }
    profile.orcamento = val;
  } else {
    // Tenta capturar números puros altos (ex: "até 1200000")
    const pureNumberMatch = normalized.match(/(\d{6,})/);
    if (pureNumberMatch) {
      profile.orcamento = parseFloat(pureNumberMatch[1]);
    }
  }

  // 4. Extração de Quartos
  const roomsMatch = normalized.match(/(\d)\s*(quarto|dormitorio|suíte|suite)/);
  if (roomsMatch) {
    profile.quartos = parseInt(roomsMatch[1]);
  }

  return profile;
}
