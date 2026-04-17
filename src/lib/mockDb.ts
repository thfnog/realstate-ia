/**
 * Mock Database — In-memory data store for local testing
 * 
 * When SUPABASE_URL is not configured, the API routes use this mock
 * instead of real Supabase calls. This enables full testing of the
 * application without a database.
 * 
 * v2: Supports origem, portal_origem, moeda fields + country-aware seed data.
 */

import type { 
  Corretor, Imovel, Lead, Escala, Moeda, LeadSource, Evento, EventoComDetalhes,
  Imobiliaria, Usuario
} from '@/lib/database.types';
import { getConfig } from '@/lib/countryConfig';
import { randomUUID } from 'crypto';

// ===== Default Tenant Constants =====
export const DEFAULT_IMOBILIARIA_ID = 'imob-0000-default-id';
export const DEFAULT_USUARIO_ID = 'user-0000-default-admin';

// ===== In-memory data stores =====

const globalForMock = global as unknown as {
  __mockDb: {
    imobiliarias: Imobiliaria[];
    usuarios: Usuario[];
    corretores: Corretor[];
    imoveis: Imovel[];
    leads: Lead[];
    escala: (Escala & { corretores?: Corretor })[];
    eventos: Evento[];
  }
};

if (!globalForMock.__mockDb) {
  globalForMock.__mockDb = {
    imobiliarias: [],
    usuarios: [],
    corretores: [],
    imoveis: [],
    leads: [],
    escala: [],
    eventos: [],
  };
}

const { imobiliarias, usuarios, corretores, imoveis, leads, escala, eventos } = globalForMock.__mockDb;

// ===== Check if we should use mock =====
export function isMockMode(): boolean {
  return !process.env.SUPABASE_URL || process.env.SUPABASE_URL.trim() === '';
}

// ===== Imobiliárias =====
export function getImobiliariaById(id: string): Imobiliaria | undefined {
  return imobiliarias.find(i => i.id === id);
}

export function createImobiliaria(data: Omit<Imobiliaria, 'id' | 'criado_em'>): Imobiliaria {
  // Enforce unique strong keys
  const idExists = imobiliarias.find(i => i.identificador_fiscal === data.identificador_fiscal);
  if (idExists) {
    throw new Error('DUPLICATE_IDENTIFIER');
  }

  const regExists = imobiliarias.find(i => i.numero_registro === data.numero_registro);
  if (regExists) {
    throw new Error('DUPLICATE_REGISTRATION');
  }

  const imob: Imobiliaria = {
    id: randomUUID(),
    criado_em: new Date().toISOString(),
    ...data,
  };
  imobiliarias.push(imob);
  return imob;
}

export function updateImobiliaria(id: string, data: Partial<Imobiliaria>): Imobiliaria | null {
  const idx = imobiliarias.findIndex(i => i.id === id);
  if (idx === -1) return null;
  imobiliarias[idx] = { ...imobiliarias[idx], ...data };
  return imobiliarias[idx];
}

// ===== Usuários =====
export function getUsuarioByEmail(email: string): Usuario | undefined {
  return usuarios.find(u => u.email === email);
}

export function getUsuarioById(id: string): Usuario | undefined {
  return usuarios.find(u => u.id === id);
}

export function createUsuario(data: Omit<Usuario, 'id' | 'criado_em'>): Usuario {
  const user: Usuario = {
    id: randomUUID(),
    criado_em: new Date().toISOString(),
    ...data,
  };
  usuarios.push(user);
  return user;
}

// ===== Corretores =====

export function getCorretores(): Corretor[] {
  return [...corretores].sort(
    (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
  );
}

export function getCorretorById(id: string): Corretor | undefined {
  return corretores.find((c) => c.id === id);
}

export function createCorretor(data: Omit<Corretor, 'id' | 'criado_em'>): Corretor {
  const corretor: Corretor = {
    id: randomUUID(),
    criado_em: new Date().toISOString(),
    ...data,
  };
  corretores.push(corretor);
  return corretor;
}

export function updateCorretor(id: string, data: Partial<Corretor>): Corretor | null {
  const idx = corretores.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  corretores[idx] = { ...corretores[idx], ...data };
  return corretores[idx];
}

export function deleteCorretor(id: string): boolean {
  const idx = corretores.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  corretores.splice(idx, 1);
  return true;
}

// ===== Imóveis =====

export function getImoveis(status?: string): Imovel[] {
  let result = [...imoveis];
  if (status) result = result.filter((i) => i.status === status);
  return result.sort(
    (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
  );
}

export function getImovelById(id: string): Imovel | undefined {
  return imoveis.find((i) => i.id === id);
}

export function createImovel(data: Omit<Imovel, 'id' | 'criado_em'>): Imovel {
  const imovel: Imovel = {
    id: randomUUID(),
    criado_em: new Date().toISOString(),
    ...data,
  };
  imoveis.push(imovel);
  return imovel;
}

export function updateImovel(id: string, data: Partial<Imovel>): Imovel | null {
  const idx = imoveis.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  imoveis[idx] = { ...imoveis[idx], ...data };
  return imoveis[idx];
}

export function deleteImovel(id: string): boolean {
  const idx = imoveis.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  imoveis.splice(idx, 1);
  return true;
}

// ===== Leads =====

export function getLeads(status?: string): (Lead & { corretores: Corretor | null })[] {
  let result = [...leads];
  if (status) result = result.filter((l) => l.status === status);
  return result
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    .map((l) => ({
      ...l,
      corretores: l.corretor_id ? getCorretorById(l.corretor_id) || null : null,
    }));
}

export function getLeadById(id: string): Lead | undefined {
  return leads.find((l) => l.id === id);
}

export function getLeadByTelefone(telefone: string): Lead | undefined {
  return leads.find((l) => l.telefone === telefone);
}

export function createLead(data: Omit<Lead, 'id' | 'criado_em'>): Lead {
  const lead: Lead = {
    id: randomUUID(),
    criado_em: new Date().toISOString(),
    ...data,
  };
  leads.push(lead);
  return lead;
}

export function updateLead(id: string, data: Partial<Lead>): (Lead & { corretores: Corretor | null }) | null {
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  leads[idx] = { ...leads[idx], ...data };
  return {
    ...leads[idx],
    corretores: leads[idx].corretor_id ? getCorretorById(leads[idx].corretor_id!) || null : null,
  };
}

// ===== Escala =====

export function getEscala(start?: string, end?: string): (Escala & { corretores: Corretor | null })[] {
  let result = [...escala];
  if (start) result = result.filter((e) => e.data >= start);
  if (end) result = result.filter((e) => e.data <= end);
  return result
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((e) => ({
      ...e,
      corretores: getCorretorById(e.corretor_id) || null,
    }));
}

export function getEscalaByDate(data: string): (Escala & { corretores: Corretor | null })[] {
  return escala
    .filter((e) => e.data === data)
    .map((e) => ({
      ...e,
      corretores: getCorretorById(e.corretor_id) || null,
    }));
}

export function createEscala(data: { imobiliaria_id: string; corretor_id: string; data: string }): (Escala & { corretores: Corretor | null }) | { error: string } {
  // Check for duplicate
  const exists = escala.find(
    (e) => e.corretor_id === data.corretor_id && e.data === data.data
  );
  if (exists) return { error: 'duplicate' };

  const entry: Escala = {
    id: randomUUID(),
    imobiliaria_id: data.imobiliaria_id,
    corretor_id: data.corretor_id,
    data: data.data,
  };
  escala.push(entry);
  return {
    ...entry,
    corretores: getCorretorById(data.corretor_id) || null,
  };
}

export function deleteEscala(id: string): boolean {
  const idx = escala.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  escala.splice(idx, 1);
  return true;
}

// ===== Eventos =====

export function getEventos(leadId?: string, start?: string, end?: string): EventoComDetalhes[] {
  let result = [...eventos];
  if (leadId) result = result.filter(e => e.lead_id === leadId);
  if (start) result = result.filter(e => e.data_hora >= start);
  if (end) result = result.filter(e => e.data_hora <= end);
  
  return result
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
    .map(e => ({
      ...e,
      lead: getLeadById(e.lead_id) || null,
      corretor: e.corretor_id ? getCorretorById(e.corretor_id) || null : null,
    }));
}

export function createEvento(data: Omit<Evento, 'id' | 'criado_em'>): Evento {
  const evento: Evento = {
    id: randomUUID(),
    criado_em: new Date().toISOString(),
    ...data,
  };
  eventos.push(evento);
  return evento;
}

export function updateEvento(id: string, data: Partial<Evento>): Evento | null {
  const idx = eventos.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  eventos[idx] = { ...eventos[idx], ...data };
  return eventos[idx];
}

export function deleteEvento(id: string): boolean {
  const idx = eventos.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  eventos.splice(idx, 1);
  return true;
}

// ===== Seed data for testing =====

function seedPT() {
  const moeda: Moeda = 'EUR';
  const iId = DEFAULT_IMOBILIARIA_ID;

  // Create brokers (consultores in PT)
  const c1 = createCorretor({ imobiliaria_id: iId, nome: 'João Ferreira', telefone: '+351912345001', email: 'joao@imob.pt', ativo: true });
  const c2 = createCorretor({ imobiliaria_id: iId, nome: 'Ana Rodrigues', telefone: '+351912345002', email: 'ana@imob.pt', ativo: true });
  const c3 = createCorretor({ imobiliaria_id: iId, nome: 'Pedro Santos', telefone: '+351912345003', email: 'pedro@imob.pt', ativo: true });
  createCorretor({ imobiliaria_id: iId, nome: 'Maria Costa', telefone: '+351912345004', email: 'maria@imob.pt', ativo: false });

  // Create properties (Portugal — T1, T2, T3, etc.)
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', bairro: 'Chiado', valor: 350000, moeda, area_m2: 65, quartos: 2, vagas: 1, status: 'disponivel', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', bairro: 'Cascais', valor: 480000, moeda, area_m2: 90, quartos: 3, vagas: 2, status: 'disponivel', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'casa', bairro: 'Sintra', valor: 520000, moeda, area_m2: 140, quartos: 4, vagas: 2, status: 'disponivel', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', bairro: 'Alfama', valor: 220000, moeda, area_m2: 45, quartos: 1, vagas: 0, status: 'disponivel', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'casa', bairro: 'Cascais', valor: 750000, moeda, area_m2: 200, quartos: 5, vagas: 3, status: 'disponivel', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'terreno', bairro: 'Sintra', valor: 180000, moeda, area_m2: 400, quartos: null, vagas: 0, status: 'disponivel', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', bairro: 'Parque das Nações', valor: 420000, moeda, area_m2: 80, quartos: 3, vagas: 1, status: 'disponivel', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'casa', bairro: 'Chiado', valor: 680000, moeda, area_m2: 130, quartos: 3, vagas: 1, status: 'vendido', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', bairro: 'Parque das Nações', valor: 310000, moeda, area_m2: 60, quartos: 2, vagas: 1, status: 'disponivel', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', bairro: 'Alfama', valor: 280000, moeda, area_m2: 55, quartos: 1, vagas: 0, status: 'disponivel', link_fotos: null });

  // Create schedule
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    if (i % 2 === 0) createEscala({ imobiliaria_id: iId, corretor_id: c1.id, data: dateStr });
    if (i % 2 === 1) createEscala({ imobiliaria_id: iId, corretor_id: c2.id, data: dateStr });
    if (i % 3 === 0) createEscala({ imobiliaria_id: iId, corretor_id: c3.id, data: dateStr });
  }

  // Seed some leads with diverse origins (PT)
  const origins: { origem: LeadSource; portal: string | null }[] = [
    { origem: 'formulario', portal: null },
    { origem: 'email_ego', portal: 'Idealista' },
    { origem: 'email_ego', portal: 'Imovirtual' },
    { origem: 'formulario', portal: null },
    { origem: 'email_ego', portal: 'Casa Sapo' },
    { origem: 'manual', portal: null },
  ];

  const sampleLeads = [
    { nome: 'Miguel Silva', telefone: '+351911111111', finalidade: 'comprar' as const, tipo: 'apartamento', quartos: 2, orcamento: 350000, bairros: ['Chiado', 'Alfama'] },
    { nome: 'Sofia Martins', telefone: '+351922222222', finalidade: 'alugar' as const, tipo: 'apartamento', quartos: 1, orcamento: 1200, bairros: ['Alfama'] },
    { nome: 'Ricardo Almeida', telefone: '+351933333333', finalidade: 'comprar' as const, tipo: 'casa', quartos: 4, orcamento: 550000, bairros: ['Sintra'] },
    { nome: 'Inês Pereira', telefone: '+351944444444', finalidade: 'investir' as const, tipo: 'apartamento', quartos: 2, orcamento: 300000, bairros: ['Parque das Nações'] },
    { nome: 'Tiago Oliveira', telefone: '+351955555555', finalidade: 'comprar' as const, tipo: null, quartos: null, orcamento: null, bairros: null },
    { nome: 'Beatriz Fernandes', telefone: '+351966666666', finalidade: 'comprar' as const, tipo: 'apartamento', quartos: 3, orcamento: 450000, bairros: ['Cascais'] },
  ];

  sampleLeads.forEach((sl, idx) => {
    const o = origins[idx];
    createLead({
      nome: sl.nome,
      telefone: sl.telefone,
      origem: o.origem,
      portal_origem: o.portal,
      moeda,
      finalidade: sl.finalidade,
      prazo: sl.finalidade === 'comprar' ? '3-6 meses' : null,
      pagamento: sl.finalidade === 'comprar' ? 'financiamento' : null,
      descricao_interesse: null,
      tipo_interesse: sl.tipo,
      orcamento: sl.orcamento,
      area_interesse: null,
      quartos_interesse: sl.quartos,
      vagas_interesse: null,
      bairros_interesse: sl.bairros,
      corretor_id: idx < 3 ? c1.id : null,
      status: idx < 2 ? 'em_atendimento' : 'novo',
    });
  });

  // Seed Events (PT)
  const dt1 = new Date();
  dt1.setDate(dt1.getDate() + 1);
  dt1.setHours(14, 30, 0, 0);
  createEvento({
    imobiliaria_id: iId,
    lead_id: leads[0].id,
    corretor_id: leads[0].corretor_id,
    tipo: 'visita',
    titulo: 'Visita ao Apartamento no Chiado',
    descricao: 'Cliente leva a esposa.',
    data_hora: dt1.toISOString(),
    local: 'Chiado, Lisboa',
    status: 'agendado',
  });

  const dt2 = new Date();
  dt2.setDate(dt2.getDate() - 2);
  dt2.setHours(10, 0, 0, 0);
  createEvento({
    imobiliaria_id: iId,
    lead_id: leads[1].id,
    corretor_id: leads[1].corretor_id,
    tipo: 'reuniao',
    titulo: 'Reunião Inicial',
    descricao: 'Entender perfil.',
    data_hora: dt2.toISOString(),
    local: 'Escritório',
    status: 'realizado',
  });
}

function seedBR() {
  const moeda: Moeda = 'BRL';
  const iId = DEFAULT_IMOBILIARIA_ID;

  // Create brokers
  const c1 = createCorretor({ imobiliaria_id: iId, nome: 'Carlos Mendes', telefone: '+5511999990001', email: 'carlos@imob.com', ativo: true });
  const c2 = createCorretor({ imobiliaria_id: iId, nome: 'Ana Beatriz', telefone: '+5511999990002', email: 'ana@imob.com', ativo: true });
  const c3 = createCorretor({ imobiliaria_id: iId, nome: 'Roberto Silva', telefone: '+5511999990003', email: 'roberto@imob.com', ativo: true });
  createCorretor({ imobiliaria_id: iId, nome: 'Juliana Costa', telefone: '+5511999990004', email: 'juliana@imob.com', ativo: false });

  // Create properties
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', bairro: 'Centro', valor: 450000, moeda, area_m2: 72, quartos: 2, vagas: 1, status: 'disponivel', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', bairro: 'Jardins', valor: 680000, moeda, area_m2: 95, quartos: 3, vagas: 2, status: 'disponivel', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'casa', bairro: 'Vila Nova', valor: 520000, moeda, area_m2: 120, quartos: 3, vagas: 2, status: 'disponivel', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', bairro: 'Centro', valor: 320000, moeda, area_m2: 55, quartos: 1, vagas: 1, status: 'disponivel', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'casa', bairro: 'Jardins', valor: 850000, moeda, area_m2: 180, quartos: 4, vagas: 3, status: 'disponivel', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'terreno', bairro: 'Vila Nova', valor: 200000, moeda, area_m2: 300, quartos: null, vagas: 0, status: 'disponivel', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', bairro: 'Moema', valor: 750000, moeda, area_m2: 88, quartos: 3, vagas: 2, status: 'disponivel', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'casa', bairro: 'Centro', valor: 480000, moeda, area_m2: 110, quartos: 3, vagas: 1, status: 'vendido', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', bairro: 'Moema', valor: 420000, moeda, area_m2: 65, quartos: 2, vagas: 1, status: 'disponivel', link_fotos: null });
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', bairro: 'Vila Nova', valor: 380000, moeda, area_m2: 70, quartos: 2, vagas: 1, status: 'disponivel', link_fotos: null });

  // Create schedule
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    if (i % 2 === 0) createEscala({ imobiliaria_id: iId, corretor_id: c1.id, data: dateStr });
    if (i % 2 === 1) createEscala({ imobiliaria_id: iId, corretor_id: c2.id, data: dateStr });
    if (i % 3 === 0) createEscala({ imobiliaria_id: iId, corretor_id: c3.id, data: dateStr });
  }

  // Seed some leads with diverse origins (BR)
  const origins: { origem: LeadSource; portal: string | null }[] = [
    { origem: 'formulario', portal: null },
    { origem: 'webhook_grupozap', portal: 'ZAP Imóveis' },
    { origem: 'webhook_grupozap', portal: 'OLX' },
    { origem: 'formulario', portal: null },
    { origem: 'webhook_grupozap', portal: 'VivaReal' },
    { origem: 'manual', portal: null },
  ];

  const sampleLeads = [
    { nome: 'Maria Oliveira', telefone: '(11) 91234-5001', finalidade: 'comprar' as const, tipo: 'apartamento', quartos: 2, orcamento: 500000, bairros: ['Centro'] },
    { nome: 'João Santos', telefone: '(11) 91234-5002', finalidade: 'alugar' as const, tipo: 'apartamento', quartos: 3, orcamento: 3500, bairros: ['Moema', 'Jardins'] },
    { nome: 'Ana Paula Costa', telefone: '(11) 91234-5003', finalidade: 'comprar' as const, tipo: 'casa', quartos: 3, orcamento: 550000, bairros: ['Vila Nova'] },
    { nome: 'Carlos Eduardo', telefone: '(11) 91234-5004', finalidade: 'investir' as const, tipo: 'apartamento', quartos: 2, orcamento: 400000, bairros: ['Centro', 'Moema'] },
    { nome: 'Fernanda Lima', telefone: '(11) 91234-5005', finalidade: 'comprar' as const, tipo: null, quartos: null, orcamento: null, bairros: null },
    { nome: 'Paulo Ribeiro', telefone: '(11) 91234-5006', finalidade: 'comprar' as const, tipo: 'apartamento', quartos: 3, orcamento: 700000, bairros: ['Jardins'] },
  ];

  sampleLeads.forEach((sl, idx) => {
    const o = origins[idx];
    createLead({
      imobiliaria_id: iId,
      nome: sl.nome,
      telefone: sl.telefone,
      origem: o.origem,
      portal_origem: o.portal,
      moeda,
      finalidade: sl.finalidade,
      prazo: sl.finalidade === 'comprar' ? '3-6 meses' : null,
      pagamento: sl.finalidade === 'comprar' ? 'financiamento' : null,
      descricao_interesse: null,
      tipo_interesse: sl.tipo,
      orcamento: sl.orcamento,
      area_interesse: null,
      quartos_interesse: sl.quartos,
      vagas_interesse: null,
      bairros_interesse: sl.bairros,
      corretor_id: idx < 3 ? c1.id : null,
      status: idx < 2 ? 'em_atendimento' : 'novo',
    });
  });

  // Seed Events (BR)
  const dt1 = new Date();
  dt1.setDate(dt1.getDate() + 2);
  dt1.setHours(15, 0, 0, 0);
  createEvento({
    imobiliaria_id: iId,
    lead_id: leads[0].id,
    corretor_id: leads[0].corretor_id,
    tipo: 'visita',
    titulo: 'Visita Apartamento Centro',
    descricao: 'Confirmar horário por WhatsApp.',
    data_hora: dt1.toISOString(),
    local: 'Centro, SP',
    status: 'agendado',
  });

  const dt2 = new Date();
  dt2.setDate(dt2.getDate() + 5);
  dt2.setHours(10, 30, 0, 0);
  createEvento({
    imobiliaria_id: iId,
    lead_id: leads[1].id,
    corretor_id: leads[1].corretor_id,
    tipo: 'assinatura',
    titulo: 'Assinatura Contrato Locação',
    descricao: 'Precisa levar fiador.',
    data_hora: dt2.toISOString(),
    local: 'Escritório / Cartório',
    status: 'agendado',
  });
}

export function seedTestData() {
  if (corretores.length > 0) return; // Already seeded

  const config = getConfig();
  console.log(`🌱 Seeding mock database (${config.flag} ${config.label})...`);

  // 1. Create Default Imobiliaria
  createImobiliaria({
    nome_fantasia: 'Imobiliária Demonstração',
    identificador_fiscal: '00000000000',
    numero_registro: config.code === 'PT' ? 'AMI-0000' : 'CRECI 0000-J',
    plano: 'free',
    config_pais: config.code as 'PT' | 'BR',
  });
  // Force ID to match default
  if (imobiliarias[0]) imobiliarias[0].id = DEFAULT_IMOBILIARIA_ID;

  // 2. Create Default User (Admin)
  createUsuario({
    imobiliaria_id: DEFAULT_IMOBILIARIA_ID,
    email: 'admin@imobiliaria.com',
    hash_senha: 'hashed_password_mock', // not required since we mock auth for now
    role: 'admin',
    corretor_id: null,
  });
  if (usuarios[0]) usuarios[0].id = DEFAULT_USUARIO_ID;

  if (config.code === 'PT') {
    seedPT();
  } else {
    seedBR();
  }

  console.log(`  ✅ ${corretores.length} ${config.terminology.corretorPlural.toLowerCase()}`);
  console.log(`  ✅ ${imoveis.length} imóveis`);
  console.log(`  ✅ ${escala.length} entradas na escala`);
  console.log(`  ✅ ${leads.length} leads`);
  console.log(`  ✅ ${eventos.length} eventos (agenda)`);
  console.log('🌱 Seed completo!\n');
}
