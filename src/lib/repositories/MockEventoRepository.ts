import { IEventoRepository } from './types';
import { Evento, EventoComDetalhes } from '@/lib/database.types';
import * as mock from '@/lib/mockDb';

export class MockEventoRepository implements IEventoRepository {
  async findAll(filters: { imobiliaria_id: string; corretor_id?: string; lead_id?: string }): Promise<EventoComDetalhes[]> {
    mock.seedTestData();
    return mock.getEventos(filters.lead_id, undefined, undefined, filters.corretor_id);
  }

  async findById(id: string, imobiliaria_id: string): Promise<EventoComDetalhes | null> {
    mock.seedTestData();
    const event = mock.getEventos().find(e => e.id === id);
    return event || null;
  }

  async create(data: Partial<Evento>): Promise<Evento> {
    return mock.createEvento(data as Omit<Evento, 'id' | 'criado_em'>);
  }

  async update(id: string, imobiliaria_id: string, data: Partial<Evento>): Promise<Evento> {
    const updated = mock.updateEvento(id, data);
    if (!updated) throw new Error('Evento não encontrado');
    return updated;
  }

  async delete(id: string, imobiliaria_id: string): Promise<void> {
    const success = mock.deleteEvento(id);
    if (!success) throw new Error('Evento não encontrado');
  }
}
