import { isMockMode } from '@/lib/mockDb';
import { SupabaseClient } from '@supabase/supabase-js';
import { ILeadRepository, IImovelRepository, ICorretorRepository } from './types';
import { MockLeadRepository } from './MockLeadRepository';
import { SupabaseLeadRepository } from './SupabaseLeadRepository';
import { MockImovelRepository } from './MockImovelRepository';
import { SupabaseImovelRepository } from './SupabaseImovelRepository';
import { MockCorretorRepository } from './MockCorretorRepository';
import { SupabaseCorretorRepository } from './SupabaseCorretorRepository';

/**
 * Repository Factory
 * Decides whether to use Mock or Supabase implementation based on the environment.
 */
export function getLeadRepository(client: SupabaseClient): ILeadRepository {
  if (isMockMode()) {
    return new MockLeadRepository();
  }
  return new SupabaseLeadRepository(client);
}

export function getImovelRepository(client: SupabaseClient): IImovelRepository {
  if (isMockMode()) {
    return new MockImovelRepository();
  }
  return new SupabaseImovelRepository(client);
}

export function getCorretorRepository(client: SupabaseClient): ICorretorRepository {
  if (isMockMode()) {
    return new MockCorretorRepository();
  }
  return new SupabaseCorretorRepository(client);
}
