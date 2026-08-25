/**
 * Real Estate Knowledge Graph
 * Inspired by Enterprise Assistant Knowledge Fabric & OKF
 * 
 * Relational Graph modeling properties, neighborhoods, condominium bylaws,
 * tenant qualification policies, and brokerage operational rules.
 */

import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import type { Imovel } from '@/lib/database.types';

export interface PropertyGraphNode {
  id: string;
  referencia: string;
  titulo: string;
  tipo: string;
  finalidade: string;
  valor: number;
  valor_locacao: number | null;
  condominio_mensal: number | null;
  iptu_anual: number | null;
  quartos: number;
  suites: number;
  vagas: number;
  area_util: number | null;
  bairro: string;
  cidade: string;
  endereco: string;
  comodidades: string[];
  regras: {
    aceita_pet: boolean;
    portaria_24h: boolean;
    elevador: boolean;
    sol_manha: boolean;
    varanda: boolean;
    vaga_demarcada: boolean;
  };
  destaque: string;
}

export interface NeighborhoodGraphNode {
  nome: string;
  cidade: string;
  pais: 'BR' | 'PT';
  destaques: string[];
  transporte_proximo: string[];
  pontos_interesse: string[];
}

export interface AgencyPolicyNode {
  id: string;
  categoria: 'locacao' | 'venda' | 'visitas' | 'documentos';
  titulo: string;
  conteudo: string;
  palavras_chave: string[];
}

export class RealEstateGraph {
  private static neighborhoodCache = new Map<string, NeighborhoodGraphNode>();
  private static policyCache: AgencyPolicyNode[] = [];

  /**
   * Initializes baseline neighborhood and policy knowledge
   */
  static initializeBaselineKnowledge() {
    if (this.policyCache.length > 0) return;

    this.policyCache = [
      {
        id: 'garantias_locacao',
        categoria: 'locacao',
        titulo: 'Garantias Aceitas para Aluguel',
        conteudo: 'Aceitamos Seguro Fiança (aprovação digital em até 1h), Título de Capitalização ou Caução de 3 meses. Não exigimos fiador caso utilize seguro fiança.',
        palavras_chave: ['fiador', 'caucao', 'caução', 'seguro fianca', 'seguro fiança', 'garantia', 'garantias', 'deposito']
      },
      {
        id: 'documentos_locacao',
        categoria: 'documentos',
        titulo: 'Documentação para Locação',
        conteudo: 'Documento com foto (RG/CNH ou CC/Passaporte), comprovante de residência e comprovante de rendimentos (3x o valor do aluguel). Análise 100% digital em até 24h.',
        palavras_chave: ['documento', 'documentos', 'documentacao', 'documentação', 'renda', 'comprovante', 'holerite', 'irs', 'recibo']
      },
      {
        id: 'politica_visitas',
        categoria: 'visitas',
        titulo: 'Horários e Procedimento de Visitas',
        conteudo: 'Visitas acompanhadas pelo corretor de Segunda a Sábado das 09h às 18h. Chaves disponíveis na imobiliária ou na portaria com autorização prévia.',
        palavras_chave: ['visita', 'visitas', 'horario', 'horário', 'agendamento', 'acompanhar', 'chaves', 'portaria']
      },
      {
        id: 'politica_animais',
        categoria: 'locacao',
        titulo: 'Política de Animais de Estimação (Pets)',
        conteudo: 'A maioria dos imóveis residenciais permite animais domésticos de pequeno/médio porte. Imóveis com restrição são informados expressamente.',
        palavras_chave: ['pet', 'pets', 'cachorro', 'gato', 'animal', 'animais', 'porte']
      }
    ];
  }

  /**
   * Builds or retrieves a property graph node
   */
  static buildPropertyNode(imovel: Imovel): PropertyGraphNode {
    const comodidades = imovel.comodidades || [];
    const desc = (imovel.descricao || '').toLowerCase();

    const aceita_pet = comodidades.some(c => /pet|animal/i.test(c)) || desc.includes('aceita pet') || !desc.includes('não aceita pet');
    const portaria_24h = comodidades.some(c => /portaria 24|seguranca 24/i.test(c)) || desc.includes('portaria 24');
    const elevador = comodidades.some(c => /elevador/i.test(c)) || desc.includes('elevador');
    const sol_manha = desc.includes('sol da manhã') || desc.includes('sol da manha');
    const varanda = comodidades.some(c => /varanda|sacada/i.test(c)) || desc.includes('varanda');
    const vaga_demarcada = (imovel.vagas_garagem || 0) > 0;

    const endereco = [imovel.rua, imovel.numero, imovel.freguesia, imovel.concelho].filter(Boolean).join(', ');

    return {
      id: imovel.id,
      referencia: imovel.referencia,
      titulo: imovel.titulo,
      tipo: imovel.tipo,
      finalidade: imovel.finalidade,
      valor: imovel.valor,
      valor_locacao: imovel.valor_locacao,
      condominio_mensal: imovel.condominio_mensal,
      iptu_anual: imovel.imi_iptu_anual,
      quartos: imovel.quartos || 0,
      suites: imovel.suites || 0,
      vagas: imovel.vagas_garagem || 0,
      area_util: imovel.area_util,
      bairro: imovel.freguesia || '',
      cidade: imovel.concelho || '',
      endereco,
      comodidades,
      regras: {
        aceita_pet,
        portaria_24h,
        elevador,
        sol_manha,
        varanda,
        vaga_demarcada
      },
      destaque: `${imovel.tipo} ${imovel.quartos ? `${imovel.quartos} qtos` : ''} em ${imovel.freguesia || 'região nobre'}`
    };
  }

  /**
   * Gets all agency policies
   */
  static getPolicies(): AgencyPolicyNode[] {
    this.initializeBaselineKnowledge();
    return this.policyCache;
  }
}
