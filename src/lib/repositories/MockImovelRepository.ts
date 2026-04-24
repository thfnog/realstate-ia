import * as mock from '@/lib/mockDb';
import { IImovelRepository, PaginationParams } from './types';
import { Imovel } from '@/lib/database.types';

export class MockImovelRepository implements IImovelRepository {
  async findAll(filters: { imobiliaria_id: string } & PaginationParams): Promise<{ data: Imovel[]; count: number }> {
    mock.seedTestData();
    let items = mock.getImoveis().filter(i => i.imobiliaria_id === filters.imobiliaria_id);
    
    const count = items.length;
    
    if (filters.page && filters.limit) {
      const from = (filters.page - 1) * filters.limit;
      items = items.slice(from, from + filters.limit);
    }

    return { data: items, count };
  }

  async findById(id: string, imobiliaria_id: string): Promise<Imovel | null> {
    const item = mock.getImoveis().find(i => i.id === id && i.imobiliaria_id === imobiliaria_id);
    return item || null;
  }

  async create(data: Partial<Imovel>): Promise<Imovel> {
    return mock.createImovel(data as any);
  }

  async update(id: string, imobiliaria_id: string, data: Partial<Imovel>): Promise<Imovel> {
    const item = mock.updateImovel(id, data);
    if (!item) throw new Error('Imóvel não encontrado');
    if (item.imobiliaria_id !== imobiliaria_id) throw new Error('Acesso negado');
    return item;
  }

  async delete(id: string, imobiliaria_id: string): Promise<void> {
    const deleted = mock.deleteImovel(id);
    if (!deleted) throw new Error('Imóvel não encontrado');
  }
}
