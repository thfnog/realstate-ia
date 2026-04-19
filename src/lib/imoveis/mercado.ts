/**
 * Inteligência de Mercado — Reference Tables (Q3 2025)
 * 
 * Data source: INE/Idealista (PT) and FipeZap (BR)
 */

export interface PrecoMercado {
  mediano: number; // m2
  valorizacao: number; // % ao ano
}

// Portugal: EUR/m2
const MERCADO_PT: Record<string, PrecoMercado> = {
  'Lisboa (cidade)': { mediano: 5995, valorizacao: 4.8 },
  'Lisboa (distrito)': { mediano: 4239, valorizacao: 4.8 },
  'Porto (cidade)': { mediano: 3885, valorizacao: 4.8 },
  'Porto (distrito)': { mediano: 2278, valorizacao: 4.8 },
  'Cascais': { mediano: 4346, valorizacao: 21.5 },
  'Oeiras': { mediano: 4161, valorizacao: 21.5 },
  'Sintra': { mediano: 2200, valorizacao: 21.5 },
  'Almada': { mediano: 3101, valorizacao: 22.6 },
  'Setúbal': { mediano: 2511, valorizacao: 22.6 },
  'Braga': { mediano: 1800, valorizacao: 27.1 },
  'Coimbra': { mediano: 1600, valorizacao: 15.0 },
  'Faro': { mediano: 3123, valorizacao: 17.0 },
  'Albufeira': { mediano: 3500, valorizacao: 17.0 },
  'Lagos': { mediano: 4000, valorizacao: 17.0 },
  'Funchal': { mediano: 3861, valorizacao: 18.0 },
  'Aveiro': { mediano: 1900, valorizacao: 12.0 },
};

// Brasil: R$/m2
// Indaiatuba values from user: Ap 11k, Lote 2k, Casa 12k
const MERCADO_BR: Record<string, PrecoMercado | Record<string, PrecoMercado>> = {
  'São Paulo': { mediano: 11500, valorizacao: 8.2 },
  'Rio de Janeiro': { mediano: 9800, valorizacao: 6.1 },
  'Florianópolis': { mediano: 10200, valorizacao: 12.4 },
  'Curitiba': { mediano: 8900, valorizacao: 7.5 },
  'Belo Horizonte': { mediano: 8100, valorizacao: 6.8 },
  'Porto Alegre': { mediano: 7800, valorizacao: 5.5 },
  'Brasília': { mediano: 8500, valorizacao: 4.2 },
  'Fortaleza': { mediano: 6500, valorizacao: 9.1 },
  'Salvador': { mediano: 6200, valorizacao: 5.0 },
  'Recife': { mediano: 6800, valorizacao: 7.2 },
  'Indaiatuba': {
    'apartamento': { mediano: 11000, valorizacao: 10.5 },
    'casa': { mediano: 12000, valorizacao: 12.0 },
    'terreno': { mediano: 2000, valorizacao: 15.0 },
  } as any,
};

export function getMedianoRegiao(pais: 'PT' | 'BR', concelho: string, tipo?: string): PrecoMercado {
  const table = pais === 'PT' ? MERCADO_PT : MERCADO_BR;
  const entry = table[concelho as keyof typeof table];

  if (!entry) {
    return { mediano: pais === 'PT' ? 1200 : 5500, valorizacao: 5.0 };
  }

  // Handle specific sub-types like Indaiatuba
  if (concelho === 'Indaiatuba' && tipo && entry[tipo as keyof typeof entry]) {
      return (entry as any)[tipo];
  }

  return entry as PrecoMercado;
}

export interface IndicadorMercado {
  variacao: number;
  badge: 'verde' | 'amarelo' | 'vermelho' | 'azul';
  label: string;
}

export function calcularIndicador(valorPedido: number, areaUtil: number, medianoRegional: number): IndicadorMercado {
  if (!areaUtil || areaUtil === 0) return { variacao: 0, badge: 'amarelo', label: 'Dados insuficientes' };
  
  const precoM2 = valorPedido / areaUtil;
  const variacao = ((precoM2 - medianoRegional) / medianoRegional) * 100;

  if (variacao <= -1) return { variacao, badge: 'azul', label: 'Abaixo do mercado — Oportunidade' };
  if (variacao <= 10) return { variacao, badge: 'verde', label: 'Preço competitivo' };
  if (variacao <= 25) return { variacao, badge: 'amarelo', label: 'Ligeiramente acima do mercado' };
  
  return { variacao, badge: 'vermelho', label: 'Acima do mercado — Pode dificultar venda' };
}
