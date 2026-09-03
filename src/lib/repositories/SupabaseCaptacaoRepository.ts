import { SupabaseClient } from '@supabase/supabase-js';
import { ICaptacaoRepository, CaptacaoFilters } from './types';
import { Captacao, CaptacaoComDetalhes } from '@/lib/database.types';

export class SupabaseCaptacaoRepository implements ICaptacaoRepository {
  constructor(private client: SupabaseClient) {}

  async findAll(filters: CaptacaoFilters): Promise<{ data: CaptacaoComDetalhes[]; count: number }> {
    let query = this.client
      .from('captacoes')
      .select('*, corretor:corretores(*), imovel:imoveis(*)', { count: 'exact' });

    query = query.eq('imobiliaria_id', filters.imobiliaria_id);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.corretor_id) query = query.eq('corretor_id', filters.corretor_id);
    if (filters.origem) query = query.eq('origem', filters.origem);
    if (filters.tipo) query = query.eq('tipo', filters.tipo);

    if (filters.search) {
      query = query.or(`titulo.ilike.%${filters.search}%,proprietario_nome.ilike.%${filters.search}%,proprietario_telefone.ilike.%${filters.search}%,freguesia.ilike.%${filters.search}%,concelho.ilike.%${filters.search}%`);
    }

    query = query.order('criado_em', { ascending: false });

    if (filters.page && filters.limit) {
      const from = (filters.page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error('SupabaseCaptacaoRepository.findAll error:', error);
      throw error;
    }

    return {
      data: (data as any[]) || [],
      count: count || 0
    };
  }

  async findById(id: string, imobiliaria_id: string): Promise<CaptacaoComDetalhes | null> {
    const { data, error } = await this.client
      .from('captacoes')
      .select('*, corretor:corretores(*), imovel:imoveis(*)')
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id)
      .maybeSingle();

    if (error) {
      console.error('SupabaseCaptacaoRepository.findById error:', error);
      return null;
    }
    return data as any;
  }

  async create(data: Partial<Captacao>): Promise<Captacao> {
    const { data: item, error } = await this.client
      .from('captacoes')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('SupabaseCaptacaoRepository.create error:', error);
      throw error;
    }
    return item as Captacao;
  }

  async update(id: string, imobiliaria_id: string, data: Partial<Captacao>): Promise<Captacao> {
    const { data: item, error } = await this.client
      .from('captacoes')
      .update({ ...data, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id)
      .select()
      .single();

    if (error) {
      console.error('SupabaseCaptacaoRepository.update error:', error);
      throw error;
    }
    return item as Captacao;
  }

  async delete(id: string, imobiliaria_id: string): Promise<void> {
    const { error } = await this.client
      .from('captacoes')
      .delete()
      .eq('id', id)
      .eq('imobiliaria_id', imobiliaria_id);

    if (error) {
      console.error('SupabaseCaptacaoRepository.delete error:', error);
      throw error;
    }
  }
}
