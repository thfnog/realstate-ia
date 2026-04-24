import { SupabaseClient } from '@supabase/supabase-js';
import { ILeadRepository, LeadFilters } from './types';
import { Lead, LeadComCorretor } from '@/lib/database.types';

export class SupabaseLeadRepository implements ILeadRepository {
  constructor(private client: SupabaseClient) {}

  async findAll(filters: LeadFilters): Promise<{ data: LeadComCorretor[]; count: number }> {
    let query = this.client
      .from('leads')
      .select('*, corretores(*), imoveis(*)', { count: 'exact' });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.corretor_id) query = query.eq('corretor_id', filters.corretor_id);
    
    // Note: imobiliaria_id filter is handled by RLS if using getUserSupabaseClient
    // If using supabaseAdmin, it might need explicit .eq('imobiliaria_id', filters.imobiliaria_id)
    // For safety and compatibility, we check if we should add it
    const isServiceKey = (this.client as any).supabaseKey?.length > 100; // rough check for service role
    if (isServiceKey) {
        query = query.eq('imobiliaria_id', filters.imobiliaria_id);
    }

    query = query.order('criado_em', { ascending: false });

    if (filters.page && filters.limit) {
      const from = (filters.page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return { 
      data: (data as unknown as LeadComCorretor[]) || [], 
      count: count || 0 
    };
  }

  async findById(id: string, imobiliaria_id: string): Promise<LeadComCorretor | null> {
    const { data, error } = await this.client
      .from('leads')
      .select('*, corretores(*), imoveis(*)')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as unknown as LeadComCorretor;
  }

  async create(data: Partial<Lead>): Promise<Lead> {
    const { data: lead, error } = await this.client
      .from('leads')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return lead as Lead;
  }

  async update(id: string, imobiliaria_id: string, data: Partial<Lead>): Promise<Lead> {
    const { data: lead, error } = await this.client
      .from('leads')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return lead as Lead;
  }

  async delete(id: string, imobiliaria_id: string): Promise<void> {
    const { error } = await this.client
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
