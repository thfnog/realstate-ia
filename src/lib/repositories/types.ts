import { Lead, Imovel, Corretor, LeadComCorretor, Evento, EventoComDetalhes, Venda, Contrato, ContratoComDetalhes, ContratoStatus, ContratoTipo, PagamentoContrato, ContratoTemplate } from '@/lib/database.types';

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface LeadFilters extends PaginationParams {
  imobiliaria_id: string;
  status?: string;
  corretor_id?: string;
  search?: string;
  origem?: string;
  finalidade?: string;
  whatsapp_type?: 'group' | 'particular';
}

export interface ILeadRepository {
  findAll(filters: LeadFilters): Promise<{ data: LeadComCorretor[]; count: number }>;
  findById(id: string, imobiliaria_id: string): Promise<LeadComCorretor | null>;
  create(data: Partial<Lead>): Promise<Lead>;
  update(id: string, imobiliaria_id: string, data: Partial<Lead>): Promise<Lead>;
  delete(id: string, imobiliaria_id: string): Promise<void>;
}

export interface ImovelFilters extends PaginationParams {
  imobiliaria_id: string;
  status?: string;
  tipo?: string;
  min_valor?: number;
  max_valor?: number;
  min_area?: number;
  max_area?: number;
  search?: string;
}

export interface IImovelRepository {
  findAll(filters: ImovelFilters): Promise<{ data: Imovel[]; count: number }>;
  findById(id: string, imobiliaria_id: string): Promise<Imovel | null>;
  create(data: Partial<Imovel>): Promise<Imovel>;
  update(id: string, imobiliaria_id: string, data: Partial<Imovel>): Promise<Imovel>;
  delete(id: string, imobiliaria_id: string): Promise<void>;
}

export interface ICorretorRepository {
  findAll(imobiliaria_id: string): Promise<Corretor[]>;
  findById(id: string, imobiliaria_id: string): Promise<Corretor | null>;
  create(data: Partial<Corretor>): Promise<Corretor>;
  update(id: string, imobiliaria_id: string, data: Partial<Corretor>): Promise<Corretor>;
  delete(id: string, imobiliaria_id: string): Promise<void>;
}

export interface IEventoRepository {
  findAll(filters: { imobiliaria_id: string; corretor_id?: string; lead_id?: string }): Promise<EventoComDetalhes[]>;
  findById(id: string, imobiliaria_id: string): Promise<EventoComDetalhes | null>;
  create(data: Partial<Evento>): Promise<Evento>;
  update(id: string, imobiliaria_id: string, data: Partial<Evento>): Promise<Evento>;
  delete(id: string, imobiliaria_id: string): Promise<void>;
}

export interface IVendaRepository {
  findAll(filters: { imobiliaria_id: string; corretor_id?: string; start_date?: string; end_date?: string }): Promise<Venda[]>;
  create(data: Partial<Venda>): Promise<Venda>;
}

export interface IContratoRepository {
  findAll(filters: { imobiliaria_id: string; status?: ContratoStatus; tipo?: ContratoTipo }): Promise<ContratoComDetalhes[]>;
  findById(id: string): Promise<ContratoComDetalhes | null>;
  create(data: Omit<Contrato, 'id' | 'criado_em' | 'atualizado_em'>): Promise<Contrato>;
  update(id: string, data: Partial<Contrato>): Promise<Contrato | null>;
  
  // Financeiro
  getPagamentos(contrato_id: string): Promise<PagamentoContrato[]>;
  createPagamento(data: Omit<PagamentoContrato, 'id' | 'criado_em'>): Promise<PagamentoContrato>;
  updatePagamento(id: string, data: Partial<PagamentoContrato>): Promise<PagamentoContrato | null>;
  
  // Templates
  getTemplates(imobiliaria_id: string): Promise<ContratoTemplate[]>;
  createTemplate(data: Omit<ContratoTemplate, 'id' | 'criado_em'>): Promise<ContratoTemplate>;
}
