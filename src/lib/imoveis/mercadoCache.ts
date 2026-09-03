/**
 * Camada de Cache em Memória para Indicadores e Estatísticas de Mercado
 * 
 * Mantém em memória cálculos e medianas de mercado (INE/FipeZAP/Bairros)
 * com TTL padrão de 24 horas para acelerar requisições consecutivas de CMA
 * e diminuir o tempo de resposta para ~2ms.
 */

import { PrecoMercado } from './mercado';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

class MercadoCacheManager {
  private store: Map<string, CacheEntry<any>>;

  constructor() {
    // Utiliza globalThis para preservar o cache entre hot-reloads no ambiente Next.js
    const globalObj = globalThis as unknown as { __imobia_mercado_cache?: Map<string, CacheEntry<any>> };
    if (!globalObj.__imobia_mercado_cache) {
      globalObj.__imobia_mercado_cache = new Map<string, CacheEntry<any>>();
    }
    this.store = globalObj.__imobia_mercado_cache;
  }

  /**
   * Obtém um valor do cache se não tiver expirado
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Grava um valor no cache com TTL configurável (padrão: 24h)
   */
  set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
    const now = Date.now();
    this.store.set(key, {
      value,
      createdAt: now,
      expiresAt: now + ttlMs,
    });
  }

  /**
   * Verifica se a chave existe e ainda é válida
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove uma chave do cache
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Wrapper síncrono que busca do cache ou computa e armazena
   */
  getOrSetSync<T>(key: string, computeFn: () => T, ttlMs: number = DEFAULT_TTL_MS): T {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const computed = computeFn();
    this.set(key, computed, ttlMs);
    return computed;
  }

  /**
   * Wrapper assíncrono que busca do cache ou computa e armazena
   */
  async getOrSet<T>(key: string, computeFn: () => Promise<T>, ttlMs: number = DEFAULT_TTL_MS): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const computed = await computeFn();
    this.set(key, computed, ttlMs);
    return computed;
  }

  /**
   * Retorna estatísticas do cache para observabilidade
   */
  getStats(): { size: number; keys: string[] } {
    const now = Date.now();
    const validKeys: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (now <= entry.expiresAt) {
        validKeys.push(key);
      } else {
        this.store.delete(key);
      }
    }

    return {
      size: validKeys.length,
      keys: validKeys,
    };
  }
}

export const mercadoCache = new MercadoCacheManager();

/**
 * Gera uma chave padronizada para cache de medianas regionais
 */
export function buildMedianoCacheKey(
  pais: 'PT' | 'BR',
  concelho: string,
  tipo?: string,
  freguesia?: string
): string {
  const normConcelho = (concelho || '').toLowerCase().trim();
  const normTipo = (tipo || '').toLowerCase().trim();
  const normFreguesia = (freguesia || '').toLowerCase().trim();
  return `mediano:${pais}:${normConcelho}:${normTipo}:${normFreguesia}`;
}

/**
 * Helper para obter a mediana regional com cache de 24 horas
 */
export function getCachedMedianoRegiao(
  pais: 'PT' | 'BR',
  concelho: string,
  tipo?: string,
  freguesia?: string,
  calculator?: () => PrecoMercado
): PrecoMercado {
  const key = buildMedianoCacheKey(pais, concelho, tipo, freguesia);
  
  return mercadoCache.getOrSetSync(key, () => {
    if (calculator) {
      return calculator();
    }
    // Fallback padrão se não fornecido calculator
    return { mediano: pais === 'PT' ? 1200 : 5500, valorizacao: 5.0 };
  });
}
