import { ICaptacaoRepository, CaptacaoFilters } from './types';
import { Captacao, CaptacaoComDetalhes } from '@/lib/database.types';
import * as mock from '@/lib/mockDb';

let mockCaptacoes: Captacao[] = [];

function seedSampleCaptacoes(imobiliaria_id: string) {
  if (mockCaptacoes.length > 0) return;

  const corretores = mock.getCorretores(imobiliaria_id);
  const corretor1 = corretores[0]?.id || null;
  const corretor2 = corretores[1]?.id || null;

  mockCaptacoes = [
    {
      id: 'cap-001',
      imobiliaria_id,
      corretor_id: corretor1,
      imovel_id: null,
      titulo: 'Apartamento Alto Padrão nos Jardins',
      tipo: 'apartamento',
      finalidade: 'venda',
      status: 'prospeccao',
      origem: 'whatsapp',
      proprietario_nome: 'Carlos Eduardo Silveira',
      proprietario_telefone: '11998877665',
      proprietario_email: 'carlos.silveira@email.com',
      distrito: 'SP',
      concelho: 'São Paulo',
      freguesia: 'Jardins',
      rua: 'Alameda Lorena',
      numero: '1420',
      complemento: 'Apto 81',
      codigo_postal: '01424-001',
      area_util: 185,
      area_total: 220,
      quartos: 3,
      suites: 3,
      banheiros: 4,
      vagas: 3,
      valor_estimado: 2450000,
      valor_locacao_estimado: null,
      condominio_estimado: 2800,
      iptu_estimado: 850,
      descricao: 'Excelente apartamento com varanda gourmet integrada, acabamento em mármore travertino e vista panorâmica.',
      observacoes: 'Proprietário quer vender em até 60 dias por motivo de mudança.',
      fotos: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'],
      dados_ia: { confianca_extracao: 0.96 },
      criado_em: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      atualizado_em: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    },
    {
      id: 'cap-002',
      imobiliaria_id,
      corretor_id: corretor2,
      imovel_id: null,
      titulo: 'Casa Contemporânea em Condomínio Fechado',
      tipo: 'casa_condominio',
      finalidade: 'venda',
      status: 'avaliacao_realizada',
      origem: 'whatsapp',
      proprietario_nome: 'Mariana Fontes',
      proprietario_telefone: '11987654321',
      proprietario_email: 'mariana.fontes@email.com',
      distrito: 'SP',
      concelho: 'Santana de Parnaíba',
      freguesia: 'Alphaville',
      rua: 'Alameda dos Ipês',
      numero: '250',
      complemento: null,
      codigo_postal: '06540-000',
      area_util: 380,
      area_total: 520,
      quartos: 4,
      suites: 4,
      banheiros: 6,
      vagas: 4,
      valor_estimado: 3800000,
      valor_locacao_estimado: null,
      condominio_estimado: 1600,
      iptu_estimado: 1200,
      descricao: 'Casa moderna recém-construída, pé-direito duplo, piscina com borda infinita, aquecimento solar e automação residencial.',
      observacoes: 'Avaliação técnica presencial feita pelo corretor. Valor de mercado aprovado.',
      fotos: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'],
      dados_ia: { confianca_extracao: 0.98 },
      criado_em: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
      atualizado_em: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    },
    {
      id: 'cap-003',
      imobiliaria_id,
      corretor_id: corretor1,
      imovel_id: null,
      titulo: 'Cobertura Duplex em Moema Pássaros',
      tipo: 'cobertura',
      finalidade: 'venda',
      status: 'autorizacao_assinada',
      origem: 'manual',
      proprietario_nome: 'Roberto Albuquerque',
      proprietario_telefone: '11977778888',
      proprietario_email: 'roberto.albuquerque@email.com',
      distrito: 'SP',
      concelho: 'São Paulo',
      freguesia: 'Moema',
      rua: 'Rua Canário',
      numero: '890',
      complemento: 'Cobertura 181',
      codigo_postal: '04521-003',
      area_util: 260,
      area_total: 310,
      quartos: 3,
      suites: 3,
      banheiros: 5,
      vagas: 3,
      valor_estimado: 3200000,
      valor_locacao_estimado: null,
      condominio_estimado: 3100,
      iptu_estimado: 1400,
      descricao: 'Cobertura com deck privativo, hidromassagem, espaço gourmet climatizado e 3 amplas suítes.',
      observacoes: 'Contrato de exclusividade de 90 dias assinado digitalmente.',
      fotos: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'],
      dados_ia: { confianca_extracao: 0.95 },
      criado_em: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
      atualizado_em: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    },
    {
      id: 'cap-004',
      imobiliaria_id,
      corretor_id: corretor2,
      imovel_id: null,
      titulo: 'Studio Mobiliado em Pinheiros',
      tipo: 'apartamento',
      finalidade: 'aluguel',
      status: 'fotos_agendadas',
      origem: 'whatsapp',
      proprietario_nome: 'Fernanda Meirelles',
      proprietario_telefone: '11966665555',
      proprietario_email: 'fernanda.m@email.com',
      distrito: 'SP',
      concelho: 'São Paulo',
      freguesia: 'Pinheiros',
      rua: 'Rua dos Pinheiros',
      numero: '500',
      complemento: 'Apto 1104',
      codigo_postal: '05422-000',
      area_util: 42,
      area_total: 48,
      quartos: 1,
      suites: 1,
      banheiros: 1,
      vagas: 1,
      valor_estimado: 450000,
      valor_locacao_estimado: 3800,
      condominio_estimado: 650,
      iptu_estimado: 180,
      descricao: 'Studio 100% mobiliado e decorado por arquiteto, a 200m do metrô Fradique Coutinho.',
      observacoes: 'Sessão de fotos profissionais agendada para amanhã às 14h.',
      fotos: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'],
      dados_ia: { confianca_extracao: 0.97 },
      criado_em: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
      atualizado_em: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    }
  ];
}

export class MockCaptacaoRepository implements ICaptacaoRepository {
  async findAll(filters: CaptacaoFilters): Promise<{ data: CaptacaoComDetalhes[]; count: number }> {
    seedSampleCaptacoes(filters.imobiliaria_id);
    let list = mockCaptacoes.filter(c => c.imobiliaria_id === filters.imobiliaria_id);

    if (filters.status) {
      list = list.filter(c => c.status === filters.status);
    }
    if (filters.corretor_id) {
      list = list.filter(c => c.corretor_id === filters.corretor_id);
    }
    if (filters.origem) {
      list = list.filter(c => c.origem === filters.origem);
    }
    if (filters.tipo) {
      list = list.filter(c => c.tipo === filters.tipo);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(c => 
        c.titulo.toLowerCase().includes(s) || 
        (c.proprietario_nome && c.proprietario_nome.toLowerCase().includes(s)) ||
        (c.proprietario_telefone && c.proprietario_telefone.includes(s)) ||
        (c.freguesia && c.freguesia.toLowerCase().includes(s)) ||
        (c.concelho && c.concelho.toLowerCase().includes(s))
      );
    }

    const count = list.length;

    if (filters.page && filters.limit) {
      const from = (filters.page - 1) * filters.limit;
      list = list.slice(from, from + filters.limit);
    }

    const dataWithDetails: CaptacaoComDetalhes[] = list.map(c => ({
      ...c,
      corretor: c.corretor_id ? mock.getCorretorById(c.corretor_id) || null : null,
      imovel: c.imovel_id ? mock.getImovelById(c.imovel_id) || null : null
    }));

    return { data: dataWithDetails, count };
  }

  async findById(id: string, imobiliaria_id: string): Promise<CaptacaoComDetalhes | null> {
    seedSampleCaptacoes(imobiliaria_id);
    const item = mockCaptacoes.find(c => c.id === id && c.imobiliaria_id === imobiliaria_id);
    if (!item) return null;

    return {
      ...item,
      corretor: item.corretor_id ? mock.getCorretorById(item.corretor_id) || null : null,
      imovel: item.imovel_id ? mock.getImovelById(item.imovel_id) || null : null
    };
  }

  async create(data: Partial<Captacao>): Promise<Captacao> {
    const now = new Date().toISOString();
    const newItem: Captacao = {
      id: data.id || `cap-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      imobiliaria_id: data.imobiliaria_id || mock.DEFAULT_IMOBILIARIA_ID,
      corretor_id: data.corretor_id || null,
      imovel_id: data.imovel_id || null,
      titulo: data.titulo || 'Nova Captação',
      tipo: data.tipo || 'apartamento',
      finalidade: data.finalidade || 'venda',
      status: data.status || 'prospeccao',
      origem: data.origem || 'whatsapp',
      proprietario_nome: data.proprietario_nome || null,
      proprietario_telefone: data.proprietario_telefone || null,
      proprietario_email: data.proprietario_email || null,
      distrito: data.distrito || 'SP',
      concelho: data.concelho || 'São Paulo',
      freguesia: data.freguesia || null,
      rua: data.rua || null,
      numero: data.numero || null,
      complemento: data.complemento || null,
      codigo_postal: data.codigo_postal || null,
      area_util: data.area_util || null,
      area_total: data.area_total || null,
      quartos: data.quartos || null,
      suites: data.suites || null,
      banheiros: data.banheiros || null,
      vagas: data.vagas || null,
      valor_estimado: data.valor_estimado || null,
      valor_locacao_estimado: data.valor_locacao_estimado || null,
      condominio_estimado: data.condominio_estimado || null,
      iptu_estimado: data.iptu_estimado || null,
      descricao: data.descricao || null,
      observacoes: data.observacoes || null,
      fotos: data.fotos || [],
      dados_ia: data.dados_ia || null,
      criado_em: now,
      atualizado_em: now
    };

    mockCaptacoes.unshift(newItem);
    return newItem;
  }

  async update(id: string, imobiliaria_id: string, data: Partial<Captacao>): Promise<Captacao> {
    const idx = mockCaptacoes.findIndex(c => c.id === id && c.imobiliaria_id === imobiliaria_id);
    if (idx === -1) throw new Error('Captação não encontrada');

    mockCaptacoes[idx] = {
      ...mockCaptacoes[idx],
      ...data,
      atualizado_em: new Date().toISOString()
    };
    return mockCaptacoes[idx];
  }

  async delete(id: string, imobiliaria_id: string): Promise<void> {
    const idx = mockCaptacoes.findIndex(c => c.id === id && c.imobiliaria_id === imobiliaria_id);
    if (idx === -1) throw new Error('Captação não encontrada');
    mockCaptacoes.splice(idx, 1);
  }
}
