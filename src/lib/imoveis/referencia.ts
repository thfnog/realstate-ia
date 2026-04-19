/**
 * Property Reference Generator
 * 
 * Format: [TYPE][YEAR][SEQ]
 * Examples: APT2025001, CAS2025042
 */

import type { TipoImovel } from '../database.types';

const TIPO_MAP: Record<TipoImovel, string> = {
  apartamento: 'APT',
  casa: 'CAS',
  terreno: 'LOT',
  loja: 'COM',
  escritorio: 'ESC',
  garagem: 'GAR',
  armazem: 'ARM',
  quintal: 'HD',
};

export function gerarReferencia(tipo: TipoImovel, sequencial: number = 1): string {
  const prefix = TIPO_MAP[tipo] || 'IMV';
  const year = new Date().getFullYear();
  const seqStr = String(sequencial).padStart(3, '0');
  
  return `${prefix}${year}${seqStr}`;
}
