import { SupabaseClient } from '@supabase/supabase-js';
import { IImovelRepository, PaginationParams } from './types';
import { Imovel } from '@/lib/database.types';

export class SupabaseImovelRepository implements IImovelRepository {
  constructor(private client: SupabaseClient) {}

  async findAll(filters: { imobiliaria_id: string } & PaginationParams): Promise<{ data: Imovel[]; count: number }> {
    let query = this.client
      .from('imoveis')
      .select('*', { count: 'exact' });

    query = query.eq('imobiliaria_id', filters.imobiliaria_id);

    query = query.order('criado_em', { ascending: false });

    if (filters.page && filters.limit) {
      const from = (filters.page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return { 
      data: (data as Imovel[]) || [], 
      count: count || 0 
    };
  }

  async findById(id: string, imobiliaria_id: string): Promise<Imovel | null> {
    const { data, error } = await this.client
      .from('imoveis')
      .select('*')
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id)
      .maybeSingle();

    if (error) return null;
    return data as Imovel;
  }

  async create(data: Partial<Imovel>): Promise<Imovel> {
    const { data: item, error } = await this.client
      .from('imoveis')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return item as Imovel;
  }

  async update(id: string, imobiliaria_id: string, data: Partial<Imovel>): Promise<Imovel> {
    const { data: item, error } = await this.client
      .from('imoveis')
      .update(data)
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id)
      .select()
      .single();

    if (error) throw error;
    return item as Imovel;
  }

  async delete(id: string, imobiliaria_id: string): Promise<void> {
    const { error } = await this.client
      .from('imoveis')
      .delete()
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id);

    if (error) throw error;
  }
}
