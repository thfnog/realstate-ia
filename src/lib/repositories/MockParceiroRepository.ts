import { IParceiroRepository, ParceiroFilters } from './types';
import { Parceiro } from '@/lib/database.types';

// In-memory list for local mock
let mockParceiros: Parceiro[] = [];

export class MockParceiroRepository implements IParceiroRepository {
  async findAll(filters: ParceiroFilters): Promise<{ data: Parceiro[]; count: number }> {
    let list = mockParceiros.filter(p => p.imobiliaria_id === filters.imobiliaria_id);

    if (filters.ativo !== undefined) {
      list = list.filter(p => p.ativo === filters.ativo);
    }

    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(p => 
        p.nome.toLowerCase().includes(s) || 
        p.telefone.includes(s) || 
        (p.imobiliaria_nome && p.imobiliaria_nome.toLowerCase().includes(s))
      );
    }

    const count = list.length;

    if (filters.page && filters.limit) {
      const from = (filters.page - 1) * filters.limit;
      list = list.slice(from, from + filters.limit);
    }

    return { data: list, count };
  }

  async findById(id: string, imobiliaria_id: string): Promise<Parceiro | null> {
    const item = mockParceiros.find(p => p.id === id && p.imobiliaria_id === imobiliaria_id);
    return item || null;
  }

  async findByTelefone(telefone: string, imobiliaria_id: string): Promise<Parceiro | null> {
    const cleanTel = telefone.replace(/\D/g, '');
    const item = mockParceiros.find(p => 
      p.telefone.replace(/\D/g, '') === cleanTel && 
      p.imobiliaria_id === imobiliaria_id
    );
    return item || null;
  }

  async create(data: Partial<Parceiro>): Promise<Parceiro> {
    const now = new Date().toISOString();
    const newItem: Parceiro = {
      id: data.id || Math.random().toString(36).substring(7),
      imobiliaria_id: data.imobiliaria_id || '',
      nome: data.nome || '',
      telefone: data.telefone || '',
      email: data.email || null,
      creci: data.creci || null,
      imobiliaria_nome: data.imobiliaria_nome || null,
      notas: data.notas || null,
      ativo: data.ativo ?? true,
      total_negocios: data.total_negocios || 0,
      criado_em: now,
      atualizado_em: now,
    };
    mockParceiros.push(newItem);
    return newItem;
  }

  async update(id: string, imobiliaria_id: string, data: Partial<Parceiro>): Promise<Parceiro> {
    const idx = mockParceiros.findIndex(p => p.id === id && p.imobiliaria_id === imobiliaria_id);
    if (idx === -1) throw new Error('Parceiro não encontrado');
    
    mockParceiros[idx] = {
      ...mockParceiros[idx],
      ...data,
      atualizado_em: new Date().toISOString()
    };
    return mockParceiros[idx];
  }

  async delete(id: string, imobiliaria_id: string): Promise<void> {
    const idx = mockParceiros.findIndex(p => p.id === id && p.imobiliaria_id === imobiliaria_id);
    if (idx === -1) throw new Error('Parceiro não encontrado');
    mockParceiros.splice(idx, 1);
  }
}
