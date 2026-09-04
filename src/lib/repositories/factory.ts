import { isMockMode } from '@/lib/mockDb';
import { SupabaseClient } from '@supabase/supabase-js';
import { ILeadRepository, IImovelRepository, ICorretorRepository, IEventoRepository, IVendaRepository, IContratoRepository, IParceiroRepository, IOportunidadeRepository, ICaptacaoRepository } from './types';
import { MockLeadRepository } from './MockLeadRepository';
import { SupabaseLeadRepository } from './SupabaseLeadRepository';
import { MockImovelRepository } from './MockImovelRepository';
import { SupabaseImovelRepository } from './SupabaseImovelRepository';
import { MockCorretorRepository } from './MockCorretorRepository';
import { SupabaseCorretorRepository } from './SupabaseCorretorRepository';
import { MockEventoRepository } from './MockEventoRepository';
import { SupabaseEventoRepository } from './SupabaseEventoRepository';
import { MockVendaRepository } from './MockVendaRepository';
import { SupabaseVendaRepository } from './SupabaseVendaRepository';
import { MockContratoRepository } from './MockContratoRepository';
import { SupabaseContratoRepository } from './SupabaseContratoRepository';
import { MockParceiroRepository } from './MockParceiroRepository';
import { SupabaseParceiroRepository } from './SupabaseParceiroRepository';
import { MockOportunidadeRepository } from './MockOportunidadeRepository';
import { SupabaseOportunidadeRepository } from './SupabaseOportunidadeRepository';
import { MockCaptacaoRepository } from './MockCaptacaoRepository';
import { SupabaseCaptacaoRepository } from './SupabaseCaptacaoRepository';

/**
 * Repository Factory
 * Decides whether to use Mock or Supabase implementation based on the environment.
 */
export function getLeadRepository(client?: SupabaseClient | null): ILeadRepository {
  if (isMockMode()) {
    return new MockLeadRepository();
  }
  return new SupabaseLeadRepository(client!);
}

export function getImovelRepository(client?: SupabaseClient | null): IImovelRepository {
  if (isMockMode()) {
    return new MockImovelRepository();
  }
  return new SupabaseImovelRepository(client!);
}

export function getCorretorRepository(client?: SupabaseClient | null): ICorretorRepository {
  if (isMockMode()) {
    return new MockCorretorRepository();
  }
  return new SupabaseCorretorRepository(client!);
}

export function getEventoRepository(client?: SupabaseClient | null): IEventoRepository {
  if (isMockMode()) {
    return new MockEventoRepository();
  }
  return new SupabaseEventoRepository(client!);
}

export function getVendaRepository(client?: SupabaseClient | null): IVendaRepository {
  if (isMockMode()) {
    return new MockVendaRepository();
  }
  return new SupabaseVendaRepository(client!);
}

export function getContratoRepository(client?: SupabaseClient | null): IContratoRepository {
  if (isMockMode()) {
    return new MockContratoRepository();
  }
  return new SupabaseContratoRepository(client!);
}

export function getParceiroRepository(client?: SupabaseClient | null): IParceiroRepository {
  if (isMockMode()) {
    return new MockParceiroRepository();
  }
  return new SupabaseParceiroRepository(client!);
}

export function getOportunidadeRepository(client?: SupabaseClient | null): IOportunidadeRepository {
  if (isMockMode()) {
    return new MockOportunidadeRepository();
  }
  return new SupabaseOportunidadeRepository(client!);
}

export function getCaptacaoRepository(client?: SupabaseClient | null): ICaptacaoRepository {
  if (isMockMode()) {
    return new MockCaptacaoRepository();
  }
  return new SupabaseCaptacaoRepository(client!);
}
