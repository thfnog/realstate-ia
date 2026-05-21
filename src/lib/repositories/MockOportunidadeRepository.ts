import { IOportunidadeRepository, OportunidadeFilters } from './types';
import { Oportunidade, OportunidadeComDetalhes } from '@/lib/database.types';

// In-memory list for local mock
let mockOportunidades: Oportunidade[] = [];

export class MockOportunidadeRepository implements IOportunidadeRepository {
  async findAll(filters: OportunidadeFilters): Promise<{ data: OportunidadeComDetalhes[]; count: number }> {
    let list = mockOportunidades.filter(o => o.imobiliaria_id === filters.imobiliaria_id);

    if (filters.status) {
      list = list.filter(o => o.status === filters.status);
    }
    if (filters.parceiro_id) {
      list = list.filter(o => o.parceiro_id === filters.parceiro_id);
    }
    if (filters.corretor_id) {
      list = list.filter(o => o.corretor_id === filters.corretor_id);
    }

    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(o => 
        o.titulo.toLowerCase().includes(s) || 
        (o.descricao && o.descricao.toLowerCase().includes(s))
      );
    }

    const count = list.length;

    if (filters.page && filters.limit) {
      const from = (filters.page - 1) * filters.limit;
      list = list.slice(from, from + filters.limit);
    }

    // Map to OportunidadeComDetalhes with null joins
    const dataWithDetails: OportunidadeComDetalhes[] = list.map(o => ({
      ...o,
      parceiro: null,
      corretor: null,
      imovel: null,
      lead: null
    }));

    return { data: dataWithDetails, count };
  }

  async findById(id: string, imobiliaria_id: string): Promise<OportunidadeComDetalhes | null> {
    const item = mockOportunidades.find(o => o.id === id && o.imobiliaria_id === imobiliaria_id);
    if (!item) return null;
    return {
      ...item,
      parceiro: null,
      corretor: null,
      imovel: null,
      lead: null
    };
  }

  async create(data: Partial<Oportunidade>): Promise<Oportunidade> {
    const now = new Date().toISOString();
    const newItem: Oportunidade = {
      id: data.id || Math.random().toString(36).substring(7),
      imobiliaria_id: data.imobiliaria_id || '',
      parceiro_id: data.parceiro_id || '',
      corretor_id: data.corretor_id || null,
      lead_id: data.lead_id || null,
      tipo: data.tipo || 'parceria_venda',
      titulo: data.titulo || '',
      descricao: data.descricao || null,
      status: data.status || 'nova',
      valor_estimado: data.valor_estimado || null,
      imovel_id: data.imovel_id || null,
      dados: data.dados || {},
      criado_em: now,
      atualizado_em: now
    };
    mockOportunidades.push(newItem);
    return newItem;
  }

  async update(id: string, imobiliaria_id: string, data: Partial<Oportunidade>): Promise<Oportunidade> {
    const idx = mockOportunidades.findIndex(o => o.id === id && o.imobiliaria_id === imobiliaria_id);
    if (idx === -1) throw new Error('Oportunidade não encontrada');

    mockOportunidades[idx] = {
      ...mockOportunidades[idx],
      ...data,
      atualizado_em: new Date().toISOString()
    };
    return mockOportunidades[idx];
  }

  async delete(id: string, imobiliaria_id: string): Promise<void> {
    const idx = mockOportunidades.findIndex(o => o.id === id && o.imobiliaria_id === imobiliaria_id);
    if (idx === -1) throw new Error('Oportunidade não encontrada');
    mockOportunidades.splice(idx, 1);
  }
}
