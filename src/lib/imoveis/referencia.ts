/**
 * Property Reference Generator
 * 
 * Format: [TYPE][YEAR][SEQ]
 * Examples: APT2025001, CAS2025042
 */

import type { TipoImovel } from '../database.types';

const TIPO_MAP: Record<TipoImovel, string> = {
  apartamento: 'APT',
  apartamento_duplex: 'DPX',
  cobertura: 'COB',
  kitnet: 'KIT',
  flat: 'FLT',
  casa: 'CAS',
  casa_condominio: 'CCD',
  sobrado: 'SOB',
  chacara: 'CHA',
  sitio: 'SIT',
  fazenda: 'FAZ',
  terreno: 'LOT',
  lote: 'LTE',
  sala_comercial: 'SAL',
  loja: 'COM',
  escritorio: 'ESC',
  galpao: 'GAL',
  barracao: 'BAR',
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
