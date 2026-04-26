import { IVendaRepository } from './types';
import { Venda } from '@/lib/database.types';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseVendaRepository implements IVendaRepository {
  constructor(private client: SupabaseClient) {}

  async findAll(filters: { imobiliaria_id: string; corretor_id?: string; start_date?: string; end_date?: string }): Promise<Venda[]> {
    let query = this.client
      .from('vendas')
      .select('*')
      .eq('imobiliaria_id', filters.imobiliaria_id);

    if (filters.corretor_id) {
      query = query.eq('corretor_id', filters.corretor_id);
    }

    if (filters.start_date) {
      query = query.gte('data_venda', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('data_venda', filters.end_date);
    }

    const { data, error } = await query.order('data_venda', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async create(data: Partial<Venda>): Promise<Venda> {
    const { data: created, error } = await this.client
      .from('vendas')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created;
  }
}
