import { SupabaseClient } from '@supabase/supabase-js';
import { IParceiroRepository, ParceiroFilters } from './types';
import { Parceiro } from '@/lib/database.types';

export class SupabaseParceiroRepository implements IParceiroRepository {
  constructor(private client: SupabaseClient) {}

  async findAll(filters: ParceiroFilters): Promise<{ data: Parceiro[]; count: number }> {
    let query = this.client
      .from('parceiros')
      .select('*', { count: 'exact' });

    query = query.eq('imobiliaria_id', filters.imobiliaria_id);

    if (filters.ativo !== undefined) {
      query = query.eq('ativo', filters.ativo);
    }

    if (filters.search) {
      const s = filters.search.trim();
      query = query.or(`nome.ilike.%${s}%,telefone.ilike.%${s}%,imobiliaria_nome.ilike.%${s}%`);
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
      data: (data as Parceiro[]) || [],
      count: count || 0
    };
  }

  async findById(id: string, imobiliaria_id: string): Promise<Parceiro | null> {
    const { data, error } = await this.client
      .from('parceiros')
      .select('*')
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id)
      .maybeSingle();

    if (error) return null;
    return data as Parceiro;
  }

  async findByTelefone(telefone: string, imobiliaria_id: string): Promise<Parceiro | null> {
    const { data, error } = await this.client
      .from('parceiros')
      .select('*')
      .eq('telefone', telefone)
      .eq('imobiliaria_id', imobiliaria_id)
      .maybeSingle();

    if (error) return null;
    return data as Parceiro;
  }

  async create(data: Partial<Parceiro>): Promise<Parceiro> {
    const { data: parceiro, error } = await this.client
      .from('parceiros')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return parceiro as Parceiro;
  }

  async update(id: string, imobiliaria_id: string, data: Partial<Parceiro>): Promise<Parceiro> {
    const { data: parceiro, error } = await this.client
      .from('parceiros')
      .update(data)
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id)
      .select()
      .single();

    if (error) throw error;
    return parceiro as Parceiro;
  }

  async delete(id: string, imobiliaria_id: string): Promise<void> {
    const { error } = await this.client
      .from('parceiros')
      .delete()
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id);

    if (error) throw error;
  }
}
