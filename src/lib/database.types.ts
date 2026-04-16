// =============================================
// Database Types — matches supabase/schema.sql
// =============================================

export type Imobiliaria = {
  id: string;
  nome_fantasia: string;
  plano: 'free' | 'pro';
  config_pais: 'PT' | 'BR';
  criado_em: string;
};

export type Role = 'admin' | 'corretor';

export type Usuario = {
  id: string;
  imobiliaria_id: string;
  email: string;
  hash_senha?: string;
  role: Role;
  corretor_id: string | null;
  criado_em: string;
};

export type Corretor = {
  id: string;
  imobiliaria_id: string;
  nome: string;
  telefone: string;
  email: string | null;
  ativo: boolean;
  criado_em: string;
};

export type TipoImovel = 'apartamento' | 'casa' | 'terreno';
export type StatusImovel = 'disponivel' | 'vendido' | 'alugado';
export type Moeda = 'EUR' | 'BRL';

export type Imovel = {
  id: string;
  imobiliaria_id: string;
  tipo: TipoImovel;
  bairro: string;
  valor: number;
  moeda: Moeda;
  area_m2: number | null;
  quartos: number | null;
  vagas: number;
  status: StatusImovel;
  link_fotos: string | null;
  criado_em: string;
};

export type Escala = {
  id: string;
  imobiliaria_id: string;
  corretor_id: string;
  data: string; // ISO date string YYYY-MM-DD
};

export type EscalaComCorretor = Escala & {
  corretores: Corretor;
};

export type Finalidade = 'comprar' | 'alugar' | 'investir';
export type StatusLead = 'novo' | 'em_atendimento' | 'visita_agendada' | 'fechado' | 'sem_interesse';
export type LeadSource = 'formulario' | 'email_ego' | 'webhook_grupozap' | 'whatsapp' | 'manual';

export type Lead = {
  id: string;
  imobiliaria_id: string;
  nome: string;
  telefone: string;
  origem: LeadSource;
  portal_origem: string | null; // 'Idealista', 'ZAP', 'OLX', 'VivaReal', etc.
  moeda: Moeda;
  finalidade: Finalidade | null;
  prazo: string | null;
  pagamento: string | null;
  descricao_interesse: string | null;
  tipo_interesse: string | null;
  orcamento: number | null;
  area_interesse: number | null;
  quartos_interesse: number | null;
  vagas_interesse: number | null;
  bairros_interesse: string[] | null;
  corretor_id: string | null;
  status: StatusLead;
  criado_em: string;
};

export type LeadComCorretor = Lead & {
  corretores: Corretor | null;
};

// =============================================
// Eventos (Agenda/Processos)
// =============================================

export type TipoEvento = 'visita' | 'assinatura' | 'cartorio' | 'reuniao' | 'vistoria' | 'outro';
export type StatusEvento = 'agendado' | 'realizado' | 'cancelado';

export type Evento = {
  id: string;
  imobiliaria_id: string;
  lead_id: string; // Foreign key para Lead
  corretor_id: string | null; // Foreign key para Corretor (opcional, pode ser o mesmo do lead)
  tipo: TipoEvento;
  titulo: string;
  descricao: string | null;
  data_hora: string; // ISO DateTime
  local: string | null;
  status: StatusEvento;
  criado_em: string;
};

export type EventoComDetalhes = Evento & {
  lead: Lead | null;
  corretor: Corretor | null;
};

// Form submission type (what comes from the public form)
export type LeadFormData = {
  nome: string;
  telefone: string;
  finalidade: Finalidade;
  origem?: LeadSource;
  portal_origem?: string;
  moeda?: Moeda;
  prazo?: string;
  pagamento?: string;
  descricao_interesse?: string;
  tipo_interesse?: string;
  orcamento?: number;
  area_interesse?: number;
  quartos_interesse?: number;
  vagas_interesse?: number;
  bairros_interesse?: string[];
};
