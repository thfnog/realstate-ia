import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const IMOB_ID = 'c29bdff8-a01f-4406-8e0a-18536bd2dc88';

const properties = [
  // VENDA
  {
    url: 'https://rodrigomartinatti.com.br/imoveis-venda/183-casa-em-condominio-para-venda-4-quarto-s-jardim-residencial-helvetia-park-i-indaiatuba-ca183',
    titulo: 'Casa Contemporânea Exclusiva - Helvetia Park I',
    valor: 6800000,
    area_util: 460,
    quartos: 4,
    vagas: 6,
    freguesia: 'Jardim Residencial Helvetia Park I',
    finalidade: 'venda',
    descricao: 'Porteira Fechada. 4 Suítes, Cinema Particular, Adega Subterrânea, Piscina com Borda Infinita e Automação Completa.',
    fotos: ['https://rodrigomartinatti.com.br/assets/uploads/imoveis/183/thumb_imovel183-6617fc4b786f5.jpg']
  },
  {
    url: 'https://rodrigomartinatti.com.br/imoveis-venda/450-casa-em-condominio-para-venda-parque-villa-dos-pinheiros-indaiatuba-ca450',
    titulo: 'Luxo no Villa dos Pinheiros',
    valor: 6200000,
    area_util: 420,
    quartos: 4,
    vagas: 6,
    freguesia: 'Parque Villa Dos Pinheiros',
    finalidade: 'venda',
    descricao: 'Imóvel de alto padrão com acabamentos nobres e área gourmet integrada.',
    fotos: ['https://rodrigomartinatti.com.br/assets/uploads/imoveis/450/thumb_imovel450-66b933da355f6.jpg']
  },
  {
    url: 'https://rodrigomartinatti.com.br/imoveis-venda/451-casa-em-condominio-para-parque-villa-dos-pinheiros-indaiatuba-ca451',
    titulo: 'Casa Moderna - Villa dos Pinheiros',
    valor: 5980000,
    area_util: 400,
    quartos: 4,
    vagas: 6,
    freguesia: 'Parque Villa Dos Pinheiros',
    finalidade: 'venda',
    descricao: 'Arquitetura contemporânea, ambientes amplos e iluminados.',
    fotos: ['https://rodrigomartinatti.com.br/assets/uploads/imoveis/451/thumb_imovel451-66b939763740e.jpg']
  },
  
  // LOCAÇÃO
  {
    url: 'https://rodrigomartinatti.com.br/locacao/392-apartamento-para-aluguel-condominio-the-park-view-vila-almeida-indaiatuba-ap392',
    titulo: 'Apartamento The Park View - Locação',
    valor: 4500,
    area_util: 93,
    quartos: 3,
    vagas: 2,
    freguesia: 'Vila Almeida',
    finalidade: 'arrendamento',
    descricao: 'Apartamento em condomínio clube. Cozinha planejada, varanda com churrasqueira e lazer completo.',
    fotos: ['https://rodrigomartinatti.com.br/assets/uploads/imoveis/392/thumb_imovel392-665f84852e90e.jpg']
  },
  {
    url: 'https://rodrigomartinatti.com.br/locacao/305-apartamento-para-aluguel-jardim-pau-preto-indaiatuba-ap305',
    titulo: 'Amplo Apartamento - Jd. Pau Preto',
    valor: 5500,
    area_util: 128,
    quartos: 3,
    vagas: 2,
    freguesia: 'Jardim Pau Preto',
    finalidade: 'arrendamento',
    descricao: 'Excelente localização no coração de Indaiatuba. Unidade andar alto com vista privilegiada.',
    fotos: ['https://rodrigomartinatti.com.br/assets/uploads/imoveis/305/thumb_imovel305-65f082e6660ea.jpg']
  },

  // MISTO (VENDA E ALUGUEL)
  {
    url: 'https://rodrigomartinatti.com.br/imoveis-venda/456-chacara-para-venda-e-aluguel-vale-das-laranjeiras-indaiatuba-ch456',
    titulo: 'Chácara Vale das Laranjeiras',
    valor: 3500000,
    area_util: 616,
    quartos: 5,
    vagas: 10,
    freguesia: 'Vale Das Laranjeiras',
    finalidade: 'ambos',
    descricao: 'Disponível para Venda (R$ 3.5M) ou Locação (R$ 13.500/mês). Propriedade espetacular com pomar e lazer privativo.',
    fotos: ['https://rodrigomartinatti.com.br/assets/uploads/imoveis/456/thumb_imovel456-66cb80f823295.jpg']
  },

  // LANÇAMENTOS
  {
    url: 'https://rodrigomartinatti.com.br/empreendimentos/edificio-residencial/30-espaco-conceicao',
    titulo: 'Lançamento: Espaço Conceição',
    valor: 0,
    area_util: 108,
    quartos: 3,
    vagas: 2,
    freguesia: 'Centro',
    finalidade: 'venda',
    descricao: 'VOCÊ NO CENTRO DE TUDO. Condomínio com Mall no térreo, clube completo e tecnologia de ponta. Plantas de 85 a 108m².',
    fotos: ['https://rodrigomartinatti.com.br/assets/uploads/empreendimentos/30/624db498308d5.jpg']
  }
];

async function run() {
  console.log('🚀 Iniciando ingestão do inventário Rodrigo Martinatti...');

  for (const prop of properties) {
    const { error } = await supabase.from('imoveis').insert({
      imobiliaria_id: IMOB_ID,
      titulo: prop.titulo,
      tipo: prop.titulo.toLowerCase().includes('apartamento') ? 'apartamento' : 'casa',
      pais: 'BR',
      distrito: 'SP',
      concelho: 'Indaiatuba',
      freguesia: prop.freguesia,
      valor: prop.valor,
      moeda: 'BRL',
      area_util: prop.area_util,
      quartos: prop.quartos,
      vagas_garagem: prop.vagas,
      status: 'disponivel',
      finalidade: prop.finalidade,
      negocio: 'residencial',
      data_captacao: new Date().toISOString().split('T')[0],
      origem_captacao: 'Scraping Rodrigo Martinatti',
      fotos: prop.fotos,
      descricao: `${prop.descricao}\n\nConfira os detalhes originais em: ${prop.url}`
    });

    if (error) {
      console.error(`❌ Erro ao inserir ${prop.titulo}:`, error.message);
    } else {
      console.log(`✅ Inserido [${prop.finalidade.toUpperCase()}]: ${prop.titulo}`);
    }
  }

  console.log('✨ Ingestão completa! Inventário atualizado.');
}

run();
