import { SupabaseClient } from '@supabase/supabase-js';
import { 
  Contrato, ContratoComDetalhes, ContratoStatus, ContratoTipo, 
  PagamentoContrato, ContratoTemplate 
} from '@/lib/database.types';
import { IContratoRepository } from './types';

export class SupabaseContratoRepository implements IContratoRepository {
  constructor(private client: SupabaseClient) {}

  async findAll(filters: { imobiliaria_id: string; status?: ContratoStatus; tipo?: ContratoTipo }): Promise<ContratoComDetalhes[]> {
    let query = this.client
      .from('contratos')
      .select('*, imovel:imoveis(*), lead:leads(*), corretor:corretores(*), pagamentos:contratos_pagamentos(*)')
      .eq('imobiliaria_id', filters.imobiliaria_id);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.tipo) query = query.eq('tipo', filters.tipo);

    const { data, error } = await query.order('criado_em', { ascending: false });
    if (error) throw error;
    return data as any[];
  }

  async findById(id: string): Promise<ContratoComDetalhes | null> {
    const { data, error } = await this.client
      .from('contratos')
      .select('*, imovel:imoveis(*), lead:leads(*), corretor:corretores(*), pagamentos:contratos_pagamentos(*)')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as any;
  }

  async create(data: Omit<Contrato, 'id' | 'criado_em' | 'atualizado_em'>): Promise<Contrato> {
    const { data: created, error } = await this.client
      .from('contratos')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created;
  }

  async update(id: string, data: Partial<Contrato>): Promise<Contrato | null> {
    const { data: updated, error } = await this.client
      .from('contratos')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  async getPagamentos(contrato_id: string): Promise<PagamentoContrato[]> {
    const { data, error } = await this.client
      .from('contratos_pagamentos')
      .select('*')
      .eq('contrato_id', contrato_id)
      .order('data_vencimento', { ascending: true });

    if (error) throw error;
    return data;
  }

  async createPagamento(data: Omit<PagamentoContrato, 'id' | 'criado_em'>): Promise<PagamentoContrato> {
    const { data: created, error } = await this.client
      .from('contratos_pagamentos')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created;
  }

  async updatePagamento(id: string, data: Partial<PagamentoContrato>): Promise<PagamentoContrato | null> {
    const { data: updated, error } = await this.client
      .from('contratos_pagamentos')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  async getTemplates(imobiliaria_id: string): Promise<ContratoTemplate[]> {
    const { data, error } = await this.client
      .from('contratos_templates')
      .select('*')
      .eq('imobiliaria_id', imobiliaria_id);

    if (error) throw error;
    return data;
  }

  async createTemplate(data: Omit<ContratoTemplate, 'id' | 'criado_em'>): Promise<ContratoTemplate> {
    const { data: created, error } = await this.client
      .from('contratos_templates')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created;
  }
}
