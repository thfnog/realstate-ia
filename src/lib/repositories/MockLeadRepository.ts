import * as mock from '@/lib/mockDb';
import { ILeadRepository, LeadFilters } from './types';
import { Lead, LeadComCorretor } from '@/lib/database.types';

export class MockLeadRepository implements ILeadRepository {
  async findAll(filters: LeadFilters): Promise<{ data: LeadComCorretor[]; count: number }> {
    mock.seedTestData();
    let leads = mock.getLeads(filters.status, filters.corretor_id);
    
    // Filter by imobiliaria_id (simulating what RLS or manual filters do)
    leads = leads.filter(l => l.imobiliaria_id === filters.imobiliaria_id);

    const count = leads.length;
    
    // Pagination
    if (filters.page && filters.limit) {
      const from = (filters.page - 1) * filters.limit;
      leads = leads.slice(from, from + filters.limit);
    }

    // Map to LeadComCorretor (Mock might need to join corretores/imoveis manually)
    const data = leads.map(l => {
      const corretor = l.corretor_id ? mock.getCorretores().find(c => c.id === l.corretor_id) : null;
      const imovel = l.imovel_id ? mock.getImoveis().find(i => i.id === l.imovel_id) : null;
      return {
        ...l,
        corretores: corretor || null,
        imoveis: imovel || null
      } as LeadComCorretor;
    });

    return { data, count };
  }

  async findById(id: string, imobiliaria_id: string): Promise<LeadComCorretor | null> {
    const lead = mock.getLeads().find(l => l.id === id && l.imobiliaria_id === imobiliaria_id);
    if (!lead) return null;

    const corretor = lead.corretor_id ? mock.getCorretores().find(c => c.id === lead.corretor_id) : null;
    const imovel = lead.imovel_id ? mock.getImoveis().find(i => i.id === lead.imovel_id) : null;

    return {
      ...lead,
      corretores: corretor || null,
      imoveis: imovel || null
    } as LeadComCorretor;
  }

  async create(data: Partial<Lead>): Promise<Lead> {
    return mock.createLead(data as any);
  }

  async update(id: string, imobiliaria_id: string, data: Partial<Lead>): Promise<Lead> {
    // In mockDb, updateLead doesn't take imobiliaria_id check, we should add it or trust the caller
    const lead = mock.updateLead(id, data);
    if (!lead) throw new Error('Lead não encontrado');
    if (lead.imobiliaria_id !== imobiliaria_id) throw new Error('Acesso negado');
    return lead;
  }

  async delete(id: string, imobiliaria_id: string): Promise<void> {
    // mockDb doesn't have deleteLead, we simulate it
    console.log(`Mock delete lead ${id} for imob ${imobiliaria_id}`);
  }
}
