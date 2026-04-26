import { 
  Contrato, ContratoComDetalhes, ContratoStatus, ContratoTipo, 
  PagamentoContrato, ContratoTemplate 
} from '@/lib/database.types';
import { IContratoRepository } from './types';
import { 
  getContratos, getContratoById, createContrato, updateContrato,
  getPagamentos, createPagamento,
  getTemplates, createTemplate,
  imoveis, leads, corretores
} from '@/lib/mockDb';

export class MockContratoRepository implements IContratoRepository {
  async findAll(filters: { imobiliaria_id: string; status?: ContratoStatus; tipo?: ContratoTipo }): Promise<ContratoComDetalhes[]> {
    let list = getContratos(filters.imobiliaria_id);
    
    if (filters.status) list = list.filter(c => c.status === filters.status);
    if (filters.tipo) list = list.filter(c => c.tipo === filters.tipo);

    return Promise.all(list.map(c => this.enrich(c)));
  }

  async findById(id: string): Promise<ContratoComDetalhes | null> {
    const contrato = getContratoById(id);
    if (!contrato) return null;
    return this.enrich(contrato);
  }

  async enrichment(c: Contrato): Promise<ContratoComDetalhes> {
    return this.enrich(c);
  }

  private async enrich(c: Contrato): Promise<ContratoComDetalhes> {
    return {
      ...c,
      imovel: imoveis.find(i => i.id === c.imovel_id) || null,
      lead: leads.find(l => l.id === c.lead_id) || null,
      corretor: corretores.find(cor => cor.id === c.corretor_id) || null,
      pagamentos: getPagamentos(c.id)
    };
  }

  async create(data: Omit<Contrato, 'id' | 'criado_em' | 'atualizado_em'>): Promise<Contrato> {
    return createContrato(data);
  }

  async update(id: string, data: Partial<Contrato>): Promise<Contrato | null> {
    return updateContrato(id, data);
  }

  async getPagamentos(contrato_id: string): Promise<PagamentoContrato[]> {
    return getPagamentos(contrato_id);
  }

  async createPagamento(data: Omit<PagamentoContrato, 'id' | 'criado_em'>): Promise<PagamentoContrato> {
    return createPagamento(data);
  }

  async updatePagamento(id: string, data: Partial<PagamentoContrato>): Promise<PagamentoContrato | null> {
    // Basic mock update logic
    return null; // Implementation deferred for now if not immediately needed
  }

  async getTemplates(imobiliaria_id: string): Promise<ContratoTemplate[]> {
    return getTemplates(imobiliaria_id);
  }

  async createTemplate(data: Omit<ContratoTemplate, 'id' | 'criado_em'>): Promise<ContratoTemplate> {
    return createTemplate(data);
  }
}
