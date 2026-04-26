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
  Corretor, Imovel, Lead, LeadComCorretor, Escala, Moeda, LeadSource, Evento, EventoComDetalhes,
  Imobiliaria, Usuario, Venda, Contrato, PagamentoContrato, ContratoTemplate
} from '@/lib/database.types';
import { getConfig } from '@/lib/countryConfig';

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
    vendas: Venda[];
    contratos: Contrato[];
    pagamentos: PagamentoContrato[];
    templates: ContratoTemplate[];
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
    vendas: [],
    contratos: [],
    pagamentos: [],
    templates: [],
  };
}

export const { imobiliarias, usuarios, corretores, imoveis, leads, escala, eventos, vendas, contratos, pagamentos, templates } = globalForMock.__mockDb;

// ===== Check if we should use mock =====
export function isMockMode(): boolean {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') return true;
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
    id: (data as any).id || crypto.randomUUID(),
    criado_em: new Date().toISOString(),
    ...data,
  } as Imobiliaria;
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
    id: (data as any).id || crypto.randomUUID(),
    criado_em: new Date().toISOString(),
    ...data,
  } as Usuario;
  usuarios.push(user);
  return user;
}

// ===== Corretores =====

export function getCorretores(imobId?: string): Corretor[] {
  if (imobId) return corretores.filter((c) => c.imobiliaria_id === imobId);
  return [...corretores];
}

export function getCorretorById(id: string): Corretor | undefined {
  return corretores.find((c) => c.id === id);
}

export function createCorretor(data: Omit<Corretor, 'id' | 'criado_em'>): Corretor {
  const corretor: Corretor = {
    id: crypto.randomUUID(),
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

export function getImoveis(filters?: { imobId?: string; status?: string }): Imovel[] {
  let result = [...imoveis];
  if (filters?.imobId) result = result.filter((i) => i.imobiliaria_id === filters.imobId);
  if (filters?.status) result = result.filter((i) => i.status === filters.status);
  
  return result.sort(
    (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
  );
}

export function getImovelById(id: string): Imovel | undefined {
  return imoveis.find((i) => i.id === id);
}

// ===== Leads =====

export function getLeads(filters?: { imobId?: string; status?: string; corretorId?: string }): LeadComCorretor[] {
  let result = [...leads];
  if (filters?.imobId) result = result.filter((l) => l.imobiliaria_id === filters.imobId);
  if (filters?.status) result = result.filter((l) => l.status === filters.status);
  if (filters?.corretorId) result = result.filter((l) => l.corretor_id === filters.corretorId);
  
  return result
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    .map((l) => ({
      ...l,
      corretores: l.corretor_id ? getCorretorById(l.corretor_id) || null : null,
      imoveis: l.imovel_id ? getImovelById(l.imovel_id) || null : null,
    }));
}

export function getLeadById(id: string): Lead | undefined {
  return leads.find((l) => l.id === id);
}

export function getImovelByReferencia(referencia: string): Imovel | undefined {
  return imoveis.find((i) => i.referencia.toUpperCase() === referencia.toUpperCase());
}

import { gerarReferencia } from './imoveis/referencia';

export function createImovel(data: Omit<Imovel, 'id' | 'criado_em' | 'referencia'>): Imovel {
  const nextSeq = imoveis.filter(i => i.tipo === data.tipo).length + 1;
  const imovel: Imovel = {
    id: crypto.randomUUID(),
    referencia: gerarReferencia(data.tipo, nextSeq),
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

// Replaced by merged version above

export function getLeadByTelefone(telefone: string, imobId?: string): Lead | undefined {
  return leads.find((l) => l.telefone === telefone && (!imobId || l.imobiliaria_id === imobId));
}

export function createLead(data: Omit<Lead, 'id' | 'criado_em'>): Lead {
  const lead: Lead = {
    id: crypto.randomUUID(),
    criado_em: new Date().toISOString(),
    ...data,
  };
  leads.push(lead);
  return lead;
}

export function updateLead(id: string, data: Partial<Lead>): LeadComCorretor | null {
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  leads[idx] = { ...leads[idx], ...data };
  return {
    ...leads[idx],
    corretores: leads[idx].corretor_id ? getCorretorById(leads[idx].corretor_id!) || null : null,
    imoveis: leads[idx].imovel_id ? getImovelById(leads[idx].imovel_id!) || null : null,
  };
}

export function deleteLead(id: string): boolean {
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return false;
  
  // Also delete associated events
  const associatedEvents = eventos.filter(e => e.lead_id === id);
  associatedEvents.forEach(evt => {
    const eIdx = eventos.findIndex(e => e.id === evt.id);
    if (eIdx !== -1) eventos.splice(eIdx, 1);
  });

  leads.splice(idx, 1);
  return true;
}

export function purgeLeads(imobId: string): void {
  // Delete events first
  const leadIds = leads.filter(l => l.imobiliaria_id === imobId).map(l => l.id);
  
  // Remove events linked to those leads
  for (let i = eventos.length - 1; i >= 0; i--) {
    if (leadIds.includes(eventos[i].lead_id)) {
      eventos.splice(i, 1);
    }
  }

  // Remove leads
  for (let i = leads.length - 1; i >= 0; i--) {
    if (leads[i].imobiliaria_id === imobId) {
      leads.splice(i, 1);
    }
  }
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
    id: crypto.randomUUID(),
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

export function getEventos(leadId?: string, start?: string, end?: string, corretorId?: string): EventoComDetalhes[] {
  let result = [...eventos];
  if (leadId) result = result.filter(e => e.lead_id === leadId);
  if (start) result = result.filter(e => e.data_hora >= start);
  if (end) result = result.filter(e => e.data_hora <= end);
  if (corretorId) result = result.filter(e => e.corretor_id === corretorId);
  
  return result
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
    .map(e => ({
      ...e,
      lead: getLeads().find(l => l.id === e.lead_id) || null,
      corretor: e.corretor_id ? getCorretorById(e.corretor_id) || null : null,
    })) as EventoComDetalhes[];
}

export function createEvento(data: Omit<Evento, 'id' | 'criado_em'>): Evento {
  const evento: Evento = {
    id: crypto.randomUUID(),
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
  const c1 = createCorretor({ imobiliaria_id: iId, nome: 'João Ferreira', telefone: '+351912345001', email: 'joao@imob.pt', ativo: true, pref_notif_whatsapp: true, pref_notif_email: true, pref_notif_push: true });
  const c2 = createCorretor({ imobiliaria_id: iId, nome: 'Ana Rodrigues', telefone: '+351912345002', email: 'ana@imob.pt', ativo: true, pref_notif_whatsapp: true, pref_notif_email: true, pref_notif_push: true });
  const c3 = createCorretor({ imobiliaria_id: iId, nome: 'Pedro Santos', telefone: '+351912345003', email: 'pedro@imob.pt', ativo: true, pref_notif_whatsapp: true, pref_notif_email: true, pref_notif_push: true });
  createCorretor({ imobiliaria_id: iId, nome: 'Maria Costa', telefone: '+351912345004', email: 'maria@imob.pt', ativo: false, pref_notif_whatsapp: false, pref_notif_email: false, pref_notif_push: false });

  // Create properties (Portugal — T1, T2, T3, etc.)
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', freguesia: 'Chiado', valor: 350000, moeda, area_util: 65, quartos: 2, vagas_garagem: 1, status: 'disponivel', link_fotos: null } as any);
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', freguesia: 'Cascais', valor: 480000, moeda, area_util: 90, quartos: 3, vagas_garagem: 2, status: 'disponivel', link_fotos: null } as any);
  createImovel({ imobiliaria_id: iId, tipo: 'casa', freguesia: 'Sintra', valor: 520000, moeda, area_util: 140, quartos: 4, vagas_garagem: 2, status: 'disponivel', link_fotos: null } as any);
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', freguesia: 'Alfama', valor: 220000, moeda, area_util: 45, quartos: 1, vagas_garagem: 0, status: 'disponivel', link_fotos: null } as any);
  createImovel({ imobiliaria_id: iId, tipo: 'casa', freguesia: 'Cascais', valor: 750000, moeda, area_util: 200, quartos: 5, vagas_garagem: 3, status: 'disponivel', link_fotos: null } as any);
  createImovel({ imobiliaria_id: iId, tipo: 'terreno', freguesia: 'Sintra', valor: 180000, moeda, area_util: 400, quartos: null, vagas_garagem: 0, status: 'disponivel', link_fotos: null } as any);
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', freguesia: 'Parque das Nações', valor: 420000, moeda, area_util: 80, quartos: 3, vagas_garagem: 1, status: 'disponivel', link_fotos: null } as any);
  createImovel({ imobiliaria_id: iId, tipo: 'casa', freguesia: 'Chiado', valor: 680000, moeda, area_util: 130, quartos: 3, vagas_garagem: 1, status: 'vendido', link_fotos: null } as any);
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', freguesia: 'Parque das Nações', valor: 310000, moeda, area_util: 60, quartos: 2, vagas_garagem: 1, status: 'disponivel', link_fotos: null } as any);
  createImovel({ imobiliaria_id: iId, tipo: 'apartamento', freguesia: 'Alfama', valor: 280000, moeda, area_util: 55, quartos: 1, vagas_garagem: 0, status: 'disponivel', link_fotos: null } as any);

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
    { nome: 'Miguel Silva', telefone: '+351911111111', finalidade: 'comprar' as const, tipo: 'apartamento', quartos: 2, orcamento: 350000, bairros: ['Chiado', 'Alfama'], descricao: 'Interesse em T2 com vista para o rio.' },
    { nome: 'Sofia Martins', telefone: '+351922222222', finalidade: 'alugar' as const, tipo: 'apartamento', quartos: 1, orcamento: 1200, bairros: ['Alfama'] },
    { nome: 'Ricardo Almeida', telefone: '+351933333333', finalidade: 'comprar' as const, tipo: 'casa', quartos: 4, orcamento: 550000, bairros: ['Sintra'] },
    { nome: 'Inês Pereira', telefone: '+351944444444', finalidade: 'investir' as const, tipo: 'apartamento', quartos: 2, orcamento: 300000, bairros: ['Parque das Nações'] },
    { nome: 'Tiago Oliveira', telefone: '+351955555555', finalidade: 'comprar' as const, tipo: null, quartos: null, orcamento: null, bairros: null },
    { nome: 'Beatriz Fernandes', telefone: '+351966666666', finalidade: 'comprar' as const, tipo: 'apartamento', quartos: 3, orcamento: 450000, bairros: ['Cascais'] },
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
      descricao_interesse: (sl as any).descricao || null,
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
  const c1 = createCorretor({ imobiliaria_id: iId, nome: 'Carlos Mendes', telefone: '+5511999990001', email: 'carlos@imob.com', ativo: true, pref_notif_whatsapp: true, pref_notif_email: true, pref_notif_push: true });
  const c2 = createCorretor({ imobiliaria_id: iId, nome: 'Ana Beatriz', telefone: '+5511999990002', email: 'ana@imob.com', ativo: true, pref_notif_whatsapp: true, pref_notif_email: true, pref_notif_push: true });
  const c3 = createCorretor({ imobiliaria_id: iId, nome: 'Roberto Silva', telefone: '+5511999990003', email: 'roberto@imob.com', ativo: true, pref_notif_whatsapp: true, pref_notif_email: true, pref_notif_push: true });
  createCorretor({ imobiliaria_id: iId, nome: 'Juliana Costa', telefone: '+5511999990004', email: 'juliana@imob.com', ativo: false, pref_notif_whatsapp: false, pref_notif_email: false, pref_notif_push: false });

  // Seed Indaiatuba (BR) Properties for testing
  const today = new Date();
  const indaiatubaSamples = [
    { titulo: 'Ap Alto Padrão - Swiss Park', tipo: 'apartamento' as const, freguesia: 'Swiss Park', valor: 1200000, area_util: 120, quartos: 3, status: 'disponivel' as const },
    { titulo: 'Mansão Helvetia Park', tipo: 'casa' as const, freguesia: 'Helvetia Park', valor: 5500000, area_util: 400, quartos: 4, status: 'disponivel' as const },
    { titulo: 'Lote Oportunidade - Jardins Império', tipo: 'terreno' as const, freguesia: 'Jardins do Império', valor: 450000, area_util: 250, quartos: 0, status: 'disponivel' as const },
    { titulo: 'Apto Econômico - Centro', tipo: 'apartamento' as const, freguesia: 'Centro', valor: 400000, area_util: 65, quartos: 2, status: 'disponivel' as const },
    { titulo: 'Casa Moderna - Indaiatuba Park', tipo: 'casa' as const, freguesia: 'Indaiatuba Park', valor: 2400000, area_util: 200, quartos: 3, status: 'disponivel' as const },
    { titulo: 'Cobertura Jardim Pau Preto', tipo: 'apartamento' as const, freguesia: 'Jardim Pau Preto', valor: 1100000, area_util: 90, quartos: 3, status: 'reservado' as const },
    { titulo: 'Casa Térrea Maria Antonieta', tipo: 'casa' as const, freguesia: 'Maria Antonieta', valor: 1600000, area_util: 150, quartos: 3, status: 'disponivel' as const },
    { titulo: 'Lote premium no Bréscia', tipo: 'terreno' as const, freguesia: 'Bréscia', valor: 750000, area_util: 300, quartos: 0, status: 'disponivel' as const },
    { titulo: 'Ap Compacto Vila Sotto', tipo: 'apartamento' as const, freguesia: 'Vila Sotto', valor: 600000, area_util: 55, quartos: 2, status: 'disponivel' as const },
    { titulo: 'Casa Familiar no Many', tipo: 'casa' as const, freguesia: 'Many', valor: 2100000, area_util: 180, quartos: 3, status: 'vendido' as const },
  ];

  indaiatubaSamples.forEach((s) => {
    createImovel({
      imobiliaria_id: iId,
      titulo: s.titulo,
      tipo: s.tipo,
      pais: 'BR',
      distrito: 'SP',
      concelho: 'Indaiatuba',
      freguesia: s.freguesia,
      valor: s.valor,
      moeda: 'BRL',
      area_util: s.area_util,
      quartos: s.quartos,
      vagas_garagem: 2,
      status: s.status,
      finalidade: 'venda',
      negocio: 'residencial',
      data_captacao: today.toISOString().split('T')[0],
      origem_captacao: 'angariação própria',
      aceita_permuta: false,
      aceita_financiamento: true,
      fotos: [],
    } as any);
  });

  // Create schedule
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
    { nome: 'Maria Oliveira', telefone: '+5511912345001', finalidade: 'comprar' as const, tipo: 'apartamento', quartos: 2, orcamento: 500000, bairros: ['Centro'], status: 'novo' as const, origem: 'whatsapp' as const, descricao_interesse: 'Gostaria de saber mais sobre o apartamento no Swiss Park que vi no anúncio.' },
    { nome: 'João Santos', telefone: '+5511912345002', finalidade: 'alugar' as const, tipo: 'apartamento', quartos: 3, orcamento: 3500, bairros: ['Moema', 'Jardins'], status: 'em_atendimento' as const, origem: 'formulario' as const },
    { nome: 'Ana Paula Costa', telefone: '+5511912345003', finalidade: 'comprar' as const, tipo: 'casa', quartos: 3, orcamento: 1600000, bairros: ['Swiss Park'], status: 'visita_agendada' as const, origem: 'whatsapp' as const },
    { nome: 'Carlos Eduardo', telefone: '+5511912345004', finalidade: 'comprar' as const, tipo: 'casa', quartos: 4, orcamento: 5500000, bairros: ['Helvetia Park'], status: 'negociacao' as const, origem: 'manual' as const },
    { nome: 'Fernanda Lima', telefone: '+5511912345005', finalidade: 'comprar' as const, tipo: 'apartamento', quartos: 3, orcamento: 1200000, bairros: ['Swiss Park'], status: 'contrato' as const, origem: 'manual' as const },
    { nome: 'Ricardo Souza', telefone: '+5511912345006', finalidade: 'comprar' as const, tipo: 'casa', quartos: 3, orcamento: 2400000, bairros: ['Indaiatuba Park'], status: 'fechado' as const, origem: 'whatsapp' as const },
  ];

  sampleLeads.forEach((l, idx) => {
    createLead({
      imobiliaria_id: iId,
      nome: l.nome,
      telefone: l.telefone,
      origem: l.origem,
      portal_origem: l.origem === 'whatsapp' ? 'Bot Inteligente' : null,
      moeda,
      finalidade: l.finalidade,
      prazo: '3-6 meses',
      pagamento: 'financiamento',
      descricao_interesse: l.descricao_interesse || null,
      tipo_interesse: l.tipo,
      orcamento: l.orcamento,
      area_interesse: null,
      quartos_interesse: l.quartos,
      vagas_interesse: 2,
      bairros_interesse: l.bairros,
      corretor_id: idx % 2 === 0 ? c1.id : c2.id,
      status: l.status,
    } as any);
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

// ===== Vendas & Comissões =====

export function getVendas(): Venda[] {
  return [...vendas];
}

export function createVenda(data: Omit<Venda, 'id' | 'criado_em'>): Venda {
  const venda: Venda = {
    id: crypto.randomUUID(),
    criado_em: new Date().toISOString(),
    ...data,
  };
  vendas.push(venda);
  return venda;
}

// ===== Contratos =====

export function getContratos(imobiliaria_id: string): Contrato[] {
  return contratos.filter(c => c.imobiliaria_id === imobiliaria_id);
}

export function getContratoById(id: string): Contrato | undefined {
  return contratos.find(c => c.id === id);
}

export function createContrato(data: Omit<Contrato, 'id' | 'criado_em' | 'atualizado_em'>): Contrato {
  const contrato: Contrato = {
    id: crypto.randomUUID(),
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    taxa_administracao_porcentagem: 10,
    garantia_tipo: 'caucao',
    ...data,
  };
  contratos.push(contrato);
  return contrato;
}

export function updateContrato(id: string, data: Partial<Contrato>): Contrato | null {
  const idx = contratos.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  contratos[idx] = { ...contratos[idx], ...data, atualizado_em: new Date().toISOString() };
  return contratos[idx];
}

// ===== Pagamentos =====

export function getPagamentos(contratoId: string): PagamentoContrato[] {
  return pagamentos.filter((p) => p.contrato_id === contratoId);
}

export function createPagamento(data: Omit<PagamentoContrato, 'id' | 'criado_em'>): PagamentoContrato {
  const pagamento: PagamentoContrato = {
    id: crypto.randomUUID(),
    criado_em: new Date().toISOString(),
    status_repasse: 'nao_aplicavel',
    ...data,
  };
  pagamentos.push(pagamento);
  return pagamento;
}

export function updatePagamento(id: string, data: Partial<PagamentoContrato>): PagamentoContrato | null {
  const idx = pagamentos.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  pagamentos[idx] = { ...pagamentos[idx], ...data };
  return pagamentos[idx];
}

// ===== Templates =====

export function getTemplates(imobiliaria_id: string): ContratoTemplate[] {
  return templates.filter(t => t.imobiliaria_id === imobiliaria_id);
}

export function createTemplate(data: Omit<ContratoTemplate, 'id' | 'criado_em'>): ContratoTemplate {
  const temp: ContratoTemplate = {
    id: crypto.randomUUID(),
    criado_em: new Date().toISOString(),
    ...data,
  };
  templates.push(temp);
  return temp;
}

export function seedTestData() {
  const config = getConfig();
  
  // 1. Create Default Imobiliaria if missing
  if (!imobiliarias.some(i => i.id === DEFAULT_IMOBILIARIA_ID)) {
    console.log(`🌱 Seeding mock database (Force BR for JetAgency)...`);
    createImobiliaria({
      id: DEFAULT_IMOBILIARIA_ID,
      nome_fantasia: 'JetAgency Imobiliária',
      identificador_fiscal: '00000000000',
      numero_registro: 'CRECI 12345-J',
      plano: 'premium',
      config_pais: 'BR', // Force BR for these tests
      delay_auto_reply_sec: 20,
      config_lembrete_1_horas: 24,
      config_lembrete_2_horas: 48,
    } as any);
  }

  // 2. Create Default Users (Admin & Corretor) if missing
  if (!usuarios.some(u => u.email === 'admin@imobia.com')) {
    createUsuario({
      id: DEFAULT_USUARIO_ID,
      imobiliaria_id: DEFAULT_IMOBILIARIA_ID,
      email: 'admin@imobia.com',
      hash_senha: 'admin123', // In mock mode we use plain or handled by bypass
      role: 'admin',
      corretor_id: null,
      auth_id: null,
    } as any);
  }

  if (!usuarios.some(u => u.email === 'thiago@imobia.com')) {
    const c1 = corretores.find(c => c.email === 'thiago@imobia.com') || createCorretor({
      imobiliaria_id: DEFAULT_IMOBILIARIA_ID,
      nome: 'Thiago Corretor',
      telefone: '+5511912345678',
      email: 'thiago@imobia.com',
      ativo: true,
      pref_notif_whatsapp: true,
      pref_notif_email: true,
      pref_notif_push: true
    });

    createUsuario({
      imobiliaria_id: DEFAULT_IMOBILIARIA_ID,
      email: 'thiago@imobia.com',
      hash_senha: 'admin123',
      role: 'corretor',
      corretor_id: c1.id,
      auth_id: null,
    });
  }
  
  // 3. Ensure we have sufficient properties
  if (config.code === 'PT') {
    if (imoveis.length < 3) seedPT();
  } else {
    if (imoveis.length < 10) seedBR();
  }

  console.log(`  ✅ ${corretores.length} ${config.terminology.corretorPlural.toLowerCase()}`);
  console.log(`  ✅ ${imoveis.length} imóveis`);
  console.log(`  ✅ ${escala.length} entradas na escala`);
  console.log(`  ✅ ${leads.length} leads`);
  console.log(`  ✅ ${eventos.length} eventos (agenda)`);
  console.log('🌱 Seed completo!\n');
}
