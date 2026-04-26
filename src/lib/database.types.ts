// =============================================
// Database Types — matches supabase/schema.sql
// =============================================

export type Imobiliaria = {
  id: string;
  nome_fantasia: string;
  identificador_fiscal: string; // CNPJ (BR) or NIF/NIPC (PT)
  numero_registro: string; // CRECI-PJ (BR) or Licença AMI (PT)
  plano: 'free' | 'pro';
  config_pais: 'PT' | 'BR';
  delay_auto_reply_sec: number; // Padrão 20
  config_lembrete_1_horas: number; // Padrão 24
  config_lembrete_2_horas: number; // Padrão 2
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
  auth_id: string | null;
  criado_em: string;
};

export type Corretor = {
  id: string;
  imobiliaria_id: string;
  nome: string;
  telefone: string;
  email: string | null;
  ativo: boolean;
  whatsapp_instance?: string;
  whatsapp_status?: 'open' | 'close' | 'connecting';
  whatsapp_number?: string;
  // P3: Preferências de Notificação
  pref_notif_whatsapp: boolean;
  pref_notif_email: boolean;
  pref_notif_push: boolean;
  comissao_padrao?: number;
  criado_em: string;
};

export type TipoImovel = 'apartamento' | 'casa' | 'terreno' | 'loja' | 'escritorio' | 'garagem' | 'armazem' | 'quintal';
export type StatusImovel = 'disponivel' | 'reservado' | 'vendido' | 'arrendado' | 'retirado';
export type NegocioImovel = 'residencial' | 'comercial' | 'investimento';
export type Moeda = 'EUR' | 'BRL';

export type ImovelFoto = {
  id: string;
  url_thumb: string;
  url_media: string;
  url_original: string;
  legenda?: string;
  ordem: number;
  is_capa: boolean;
};

export type Imovel = {
  id: string;
  imobiliaria_id: string;
  referencia: string;
  titulo: string;
  pais: 'PT' | 'BR';
  distrito: string; // Estado no BR
  concelho: string; // Cidade no BR
  freguesia: string; // Bairro no BR
  rua: string | null;
  numero: string | null;
  codigo_postal: string | null;
  latitude: number | null;
  longitude: number | null;

  tipo: TipoImovel;
  finalidade: 'venda' | 'arrendamento' | 'ambos';
  negocio: NegocioImovel;
  corretor_id: string | null;
  data_captacao: string;
  origem_captacao: string;

  // Características (Terminologia flexível via config)
  area_bruta: number | null;
  area_util: number | null;
  area_terreno: number | null;
  quartos: number | null; // Tipologia T em PT
  suites: number | null;
  casas_banho: number | null;
  vagas_garagem: number;
  andar: number | null;
  ano_construcao: number | null;
  estado_conservacao: string | null;
  certificado_energetico: string | null;
  orientacao_solar: string[] | null;
  comodidades: string[] | null;

  // Financeiro
  valor: number;
  moeda: Moeda;
  valor_avaliacao: number | null;
  imi_iptu_anual: number | null;
  condominio_mensal: number | null;
  aceita_permuta: boolean;
  aceita_financiamento: boolean;

  // Descrição
  descricao: string | null;
  pontos_venda: string[] | null;
  observacoes_internas: string | null;

  status: StatusImovel;
  fotos: ImovelFoto[];
  comissao_venda?: number;
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
export type StatusLead = 'novo' | 'em_atendimento' | 'visita_agendada' | 'negociacao' | 'contrato' | 'fechado' | 'sem_interesse' | 'descartado';
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
  imovel_id?: string | null;
  status: StatusLead;
  lembrete_1_enviado_em?: string | null;
  lembrete_2_enviado_em?: string | null;
  criado_em: string;
};

export type LeadComCorretor = Lead & {
  corretores: Corretor | null;
  imoveis: Imovel | null;
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
  lead: LeadComCorretor | null;
  corretor: Corretor | null;
};

// =============================================
// Histórico de Mensagens
// =============================================

export type MensagemHistorico = {
  id: string;
  imobiliaria_id: string;
  lead_id: string;
  corretor_id: string | null;
  direction: 'inbound' | 'outbound';
  message_text: string;
  status: 'sent' | 'delivered' | 'read' | 'error';
  provider_id: string | null;
  criado_em: string;
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

// =============================================
// Vendas (Transactions)
// =============================================

export type Venda = {
  id: string;
  imobiliaria_id: string;
  imovel_id: string | null;
  corretor_id: string | null;
  valor_venda: number;
  porcentagem_comissao: number;
  valor_comissao: number;
  data_venda: string;
  criado_em: string;
};

// =============================================
// Contratos (Contracts)
// =============================================

export type ContratoStatus = 'rascunho' | 'assinatura_pendente' | 'ativo' | 'vencido' | 'encerrado' | 'cancelado';
export type ContratoTipo = 'venda' | 'aluguel';

export type Contrato = {
  id: string;
  imobiliaria_id: string;
  imovel_id: string | null;
  lead_id: string | null;
  corretor_id: string | null;
  tipo: 'venda' | 'aluguel';
  status: ContratoStatus;
  valor_total: number;
  valor_entrada_caucao: number;
  taxa_administracao_porcentagem?: number;
  proprietario_nome?: string;
  proprietario_contato?: string;
  garantia_tipo?: 'seguro_fianca' | 'titulo_capitalizacao' | 'fiador' | 'caucao' | 'sem_garantia';
  valor_reajuste_anual_indexador?: 'IGPM' | 'IPCA' | 'fixo';
  dia_base_reajuste?: number;
  data_inicio: string;
  data_fim?: string;
  dia_vencimento?: number;
  clausulas_extras?: string;
  documento_url?: string;
  criado_em: string;
  atualizado_em: string;
  // Joins
  imovel?: any;
  lead?: any;
  corretor?: any;
  pagamentos?: PagamentoContrato[];
};

export interface PagamentoContrato {
  id: string;
  contrato_id: string;
  tipo: 'entrada' | 'parcela' | 'aluguel_mensal' | 'comissao';
  valor_esperado: number;
  valor_pago: number;
  valor_taxa_adm?: number;
  valor_repasse_proprietario?: number;
  status_repasse?: 'nao_aplicavel' | 'pendente' | 'processado' | 'erro';
  data_vencimento: string;
  data_pagamento?: string | null;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  criado_em: string;
}

export type ContratoTemplate = {
  id: string;
  imobiliaria_id: string;
  titulo: string;
  conteudo_base: string;
  criado_em: string;
};

export type ContratoComDetalhes = Contrato & {
  imovel: Imovel | null;
  lead: Lead | null;
  corretor: Corretor | null;
  pagamentos: PagamentoContrato[];
};
