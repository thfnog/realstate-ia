import { SupabaseClient } from '@supabase/supabase-js';
import { IOportunidadeRepository, OportunidadeFilters } from './types';
import { Oportunidade, OportunidadeComDetalhes } from '@/lib/database.types';

export class SupabaseOportunidadeRepository implements IOportunidadeRepository {
  constructor(private client: SupabaseClient) {}

  async findAll(filters: OportunidadeFilters): Promise<{ data: OportunidadeComDetalhes[]; count: number }> {
    let query = this.client
      .from('oportunidades')
      .select('*, parceiro:parceiros(*), corretor:corretores(*), imovel:imoveis(*), lead:leads(*)', { count: 'exact' });

    query = query.eq('imobiliaria_id', filters.imobiliaria_id);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.parceiro_id) {
      query = query.eq('parceiro_id', filters.parceiro_id);
    }
    if (filters.corretor_id) {
      query = query.eq('corretor_id', filters.corretor_id);
    }

    if (filters.search) {
      const s = filters.search.trim();
      query = query.or(`titulo.ilike.%${s}%,descricao.ilike.%${s}%`);
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
      data: (data as unknown as OportunidadeComDetalhes[]) || [],
      count: count || 0
    };
  }

  async findById(id: string, imobiliaria_id: string): Promise<OportunidadeComDetalhes | null> {
    const { data, error } = await this.client
      .from('oportunidades')
      .select('*, parceiro:parceiros(*), corretor:corretores(*), imovel:imoveis(*), lead:leads(*)')
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id)
      .maybeSingle();

    if (error) return null;
    return data as unknown as OportunidadeComDetalhes;
  }

  async create(data: Partial<Oportunidade>): Promise<Oportunidade> {
    const { data: oportunidade, error } = await this.client
      .from('oportunidades')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return oportunidade as Oportunidade;
  }

  async update(id: string, imobiliaria_id: string, data: Partial<Oportunidade>): Promise<Oportunidade> {
    const { data: oportunidade, error } = await this.client
      .from('oportunidades')
      .update(data)
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id)
      .select()
      .single();

    if (error) throw error;
    return oportunidade as Oportunidade;
  }

  async delete(id: string, imobiliaria_id: string): Promise<void> {
    const { error } = await this.client
      .from('oportunidades')
      .delete()
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id);

    if (error) throw error;
  }
}
