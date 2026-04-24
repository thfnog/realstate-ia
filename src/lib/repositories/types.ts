import { Lead, Imovel, Corretor, LeadComCorretor, Evento } from '@/lib/database.types';

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface LeadFilters extends PaginationParams {
  imobiliaria_id: string;
  status?: string;
  corretor_id?: string;
}

export interface ILeadRepository {
  findAll(filters: LeadFilters): Promise<{ data: LeadComCorretor[]; count: number }>;
  findById(id: string, imobiliaria_id: string): Promise<LeadComCorretor | null>;
  create(data: Partial<Lead>): Promise<Lead>;
  update(id: string, imobiliaria_id: string, data: Partial<Lead>): Promise<Lead>;
  delete(id: string, imobiliaria_id: string): Promise<void>;
}

export interface IImovelRepository {
  findAll(filters: { imobiliaria_id: string } & PaginationParams): Promise<{ data: Imovel[]; count: number }>;
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

