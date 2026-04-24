import { SupabaseClient } from '@supabase/supabase-js';
import { IEventoRepository } from './types';
import { Evento, EventoComDetalhes } from '@/lib/database.types';

export class SupabaseEventoRepository implements IEventoRepository {
  constructor(private client: SupabaseClient) {}

  async findAll(filters: { imobiliaria_id: string; corretor_id?: string; lead_id?: string }): Promise<EventoComDetalhes[]> {
    let query = this.client
      .from('eventos')
      .select('*, lead:leads(*), corretor:corretores(*)')
      .eq('imobiliaria_id', filters.imobiliaria_id);

    if (filters.corretor_id) {
      query = query.eq('corretor_id', filters.corretor_id);
    }

    if (filters.lead_id) {
      query = query.eq('lead_id', filters.lead_id);
    }

    query = query.order('data_hora', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    return data as EventoComDetalhes[];
  }

  async findById(id: string, imobiliaria_id: string): Promise<EventoComDetalhes | null> {
    const { data, error } = await this.client
      .from('eventos')
      .select('*, lead:leads(*), corretor:corretores(*)')
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id)
      .single();

    if (error) return null;
    return data as EventoComDetalhes;
  }

  async create(data: Partial<Evento>): Promise<Evento> {
    const { data: evento, error } = await this.client
      .from('eventos')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return evento as Evento;
  }

  async update(id: string, imobiliaria_id: string, data: Partial<Evento>): Promise<Evento> {
    const { data: evento, error } = await this.client
      .from('eventos')
      .update(data)
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id)
      .select()
      .single();

    if (error) throw error;
    return evento as Evento;
  }

  async delete(id: string, imobiliaria_id: string): Promise<void> {
    const { error } = await this.client
      .from('eventos')
      .delete()
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id);

    if (error) throw error;
  }
}
