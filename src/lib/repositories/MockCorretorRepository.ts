import * as mock from '@/lib/mockDb';
import { ICorretorRepository } from './types';
import { Corretor } from '@/lib/database.types';

export class MockCorretorRepository implements ICorretorRepository {
  async findAll(imobiliaria_id: string): Promise<Corretor[]> {
    mock.seedTestData();
    return mock.getCorretores().filter(c => c.imobiliaria_id === imobiliaria_id);
  }

  async findById(id: string, imobiliaria_id: string): Promise<Corretor | null> {
    const item = mock.getCorretores().find(c => c.id === id && c.imobiliaria_id === imobiliaria_id);
    return item || null;
  }

  async create(data: Partial<Corretor>): Promise<Corretor> {
    return mock.createCorretor(data as any);
  }

  async update(id: string, imobiliaria_id: string, data: Partial<Corretor>): Promise<Corretor> {
    const item = mock.updateCorretor(id, data);
    if (!item) throw new Error('Corretor não encontrado');
    if (item.imobiliaria_id !== imobiliaria_id) throw new Error('Acesso negado');
    return item;
  }

  async delete(id: string, imobiliaria_id: string): Promise<void> {
    const deleted = mock.deleteCorretor(id);
    if (!deleted) throw new Error('Corretor não encontrado');
  }
}
