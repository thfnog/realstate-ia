import { IVendaRepository } from './types';
import { Venda } from '@/lib/database.types';
import { getVendas, createVenda } from '@/lib/mockDb';

export class MockVendaRepository implements IVendaRepository {
  async findAll(filters: { imobiliaria_id: string; corretor_id?: string; start_date?: string; end_date?: string }): Promise<Venda[]> {
    let result = getVendas().filter(v => v.imobiliaria_id === filters.imobiliaria_id);
    
    if (filters.corretor_id) {
      result = result.filter(v => v.corretor_id === filters.corretor_id);
    }
    
    if (filters.start_date) {
      result = result.filter(v => v.data_venda >= filters.start_date!);
    }
    
    if (filters.end_date) {
      result = result.filter(v => v.data_venda <= filters.end_date!);
    }
    
    return result;
  }

  async create(data: Partial<Venda>): Promise<Venda> {
    return createVenda(data as any);
  }
}
