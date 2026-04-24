import { SupabaseClient } from '@supabase/supabase-js';
import { ICorretorRepository } from './types';
import { Corretor } from '@/lib/database.types';

export class SupabaseCorretorRepository implements ICorretorRepository {
  constructor(private client: SupabaseClient) {}

  async findAll(imobiliaria_id: string): Promise<Corretor[]> {
    const { data, error } = await this.client
      .from('corretores')
      .select('*')
      .eq('imobiliaria_id', imobiliaria_id)
      .order('nome');

    if (error) throw error;
    return data as Corretor[];
  }

  async findById(id: string, imobiliaria_id: string): Promise<Corretor | null> {
    const { data, error } = await this.client
      .from('corretores')
      .select('*')
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id)
      .maybeSingle();

    if (error) return null;
    return data as Corretor;
  }

  async create(data: Partial<Corretor>): Promise<Corretor> {
    const { data: item, error } = await this.client
      .from('corretores')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return item as Corretor;
  }

  async update(id: string, imobiliaria_id: string, data: Partial<Corretor>): Promise<Corretor> {
    const { data: item, error } = await this.client
      .from('corretores')
      .update(data)
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id)
      .select()
      .single();

    if (error) throw error;
    return item as Corretor;
  }

  async delete(id: string, imobiliaria_id: string): Promise<void> {
    const { error } = await this.client
      .from('corretores')
      .delete()
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id);

    if (error) throw error;
  }
}
