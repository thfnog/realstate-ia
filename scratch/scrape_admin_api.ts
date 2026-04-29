/**
 * Scraper Completo via API Admin — rodrigomartinatti.com.br
 * 
 * Usa a REST API do Joomla/Widesys para extrair TODOS os imóveis
 * com todos os campos disponíveis e gera um Excel completo.
 * 
 * ⚠️ SOMENTE LEITURA — Nenhuma operação de escrita é realizada.
 */

import * as XLSX from 'xlsx';
import * as path from 'path';

const BASE_API = 'https://rodrigomartinatti.com.br/api/index.php/v1';
const AUTH = 'Basic ' + btoa('rodrigomartinatti@gmail.com:Vcpff0!@#');
const HEADERS = { 
  'Accept': 'application/vnd.api+json', 
  'Authorization': AUTH
};
const PAGE_SIZE = 50;

interface RawProduct {
  attributes: Record<string, any>;
}

// ============================================================
// Step 1: Fetch all products from API (paginated)
// ============================================================

async function fetchAllProducts(): Promise<RawProduct[]> {
  const allProducts: RawProduct[] = [];
  let offset = 0;
  let totalItems = 0;

  console.log('📡 Buscando todos os imóveis via API...\n');

  // First request to get total count
  const firstRes = await fetch(`${BASE_API}/widesys/produtos?page[limit]=1`, { headers: HEADERS });
  const firstData = await firstRes.json();
  totalItems = firstData.meta?.['total-items'] || 0;
  console.log(`  📊 Total de imóveis no sistema: ${totalItems}\n`);

  while (offset < totalItems) {
    const url = `${BASE_API}/widesys/produtos?page[limit]=${PAGE_SIZE}&page[offset]=${offset}`;
    console.log(`  → Buscando offset=${offset} (${allProducts.length}/${totalItems})...`);
    
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.error(`  ❌ Erro HTTP ${res.status} no offset ${offset}`);
      break;
    }
    
    const data = await res.json();
    if (!data.data || data.data.length === 0) break;
    
    allProducts.push(...data.data);
    offset += PAGE_SIZE;
    
    // Small delay to be polite
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n  ✅ ${allProducts.length} imóveis carregados com sucesso\n`);
  return allProducts;
}

// ============================================================
// Step 2: Fetch proprietários data (lookup table)
// ============================================================

async function fetchProprietarios(): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  
  try {
    // Try to get proprietarios from the categories endpoint
    let offset = 0;
    while (true) {
      const res = await fetch(`${BASE_API}/widesys/categories?page[limit]=100&page[offset]=${offset}&filter[extension]=com_widesys.proprietarios`, { headers: HEADERS });
      if (!res.ok) break;
      const data = await res.json();
      if (!data.data || data.data.length === 0) break;
      for (const item of data.data) {
        map.set(item.attributes.id, item.attributes.title);
      }
      offset += 100;
      if (data.data.length < 100) break;
    }
  } catch {
    // Proprietários are inline in the product data
  }

  return map;
}

// ============================================================
// Step 3: Transform raw product into flat row data
// ============================================================

interface FlatImovel {
  // Identificação
  id: number;
  referencia: string;
  nome: string;
  
  // Status
  status: string;
  disponivel: number;
  publicado: number;
  destaque: number;
  quality_score: number;
  
  // Tipo e Finalidade
  tipo_imovel: string;
  finalidade: string;
  categorias: string;
  
  // Localização
  endereco: string;
  numero: string;
  complemento: string;
  cep: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  empreendimento: string;
  endereco_completo: string;
  lat: number | null;
  lng: number | null;
  
  // Valores
  valor_venda: number;
  valor_locacao: number;
  valor_temporada: number;
  valor_condominio: number;
  valor_iptu: number;
  valor_seguro_incendio: number;
  valor_desconto: number;
  taxa_adm_mensal: number;
  taxa_locacao: number;
  taxa_venda: number;
  
  // Financiamento
  saldo_devedor: number;
  valor_prestacao: number;
  
  // Dimensões
  area_util: number;
  area_total: number;
  area_construida: number;
  area_terreno_total: number;
  area_terreno_frente: number;
  area_terreno_fundos: number;
  area_terreno_esquerdo: number;
  area_terreno_direito: number;
  area_comum: number;
  area_garagem: number;
  area_privativa: number;
  
  // Cômodos
  quartos: number;
  suites: number;
  banheiros: number;
  salas: number;
  garagens: number;
  
  // Edifício
  andar: number;
  num_andares: number;
  num_unidades_andar: number;
  num_torres: number;
  idade_construcao: string;
  
  // Proprietário
  proprietario_id: string;
  proprietario_porcentagem: string;
  
  // Registros
  num_matricula: string;
  lote: string;
  quadra: string;
  
  // Datas
  data_cadastro: string;
  data_modificacao: string;
  data_captacao: string;
  
  // Descrição
  descricao: string;
  observacoes: string;
  
  // Características
  caracteristicas_imovel: string;
  caracteristicas_condominio: string;
  caracteristicas_planta: string;
  
  // Imagens
  thumb: string;
  imagens_urls: string;
  total_imagens: number;
  
  // Mídia
  video: string;
  
  // Corretor(es)
  corretores: string;
  
  // URL pública
  url: string;
}

function cleanHtml(html: string | null): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function transformProduct(raw: RawProduct): FlatImovel {
  const a = raw.attributes;
  
  // Extract proprietário info
  let proprietarioId = '';
  let proprietarioPorcentagem = '';
  if (Array.isArray(a.proprietarios) && a.proprietarios.length > 0) {
    proprietarioId = a.proprietarios.map((p: any) => p.proprietario_id).join(', ');
    proprietarioPorcentagem = a.proprietarios.map((p: any) => p.porcentagem).join(', ');
  }
  
  // Extract categorias
  let categorias = '';
  if (Array.isArray(a.categorias)) {
    categorias = a.categorias.map((c: any) => c.title).join(', ');
  }
  
  // Extract características do imóvel
  let caracImovel = '';
  if (Array.isArray(a.caracteristicas)) {
    caracImovel = a.caracteristicas.map((c: any) => c.title).join(', ');
  }
  
  // Extract características do condomínio/acomodações
  let caracCond = '';
  if (Array.isArray(a.caracteristicas_acomodacoes)) {
    caracCond = a.caracteristicas_acomodacoes.map((c: any) => c.title).join(', ');
  }

  // Extract características da planta
  let caracPlanta = '';
  if (Array.isArray(a.caracteristicas_planta)) {
    caracPlanta = a.caracteristicas_planta.map((c: any) => c.title).join(', ');
  }
  
  // Extract image URLs
  let imagensUrls = '';
  let totalImagens = 0;
  if (Array.isArray(a.imagens)) {
    totalImagens = a.imagens.length;
    imagensUrls = a.imagens
      .filter((img: any) => img.published === 1)
      .map((img: any) => img.url || img.nome)
      .join(' | ');
  }
  
  // Extract corretores
  let corretores = '';
  if (Array.isArray(a.corretores) && a.corretores.length > 0) {
    corretores = a.corretores.map((c: any) => c.nome || c.name || c.id).join(', ');
  }

  return {
    id: a.id || 0,
    referencia: a.referencia || '',
    nome: a.nome || '',
    
    status: a.nome_status || '',
    disponivel: a.disponivel || 0,
    publicado: a.published || 0,
    destaque: a.featured || 0,
    quality_score: a.quality_score || 0,
    
    tipo_imovel: a.nome_tipo || '',
    finalidade: a.finalidade || '',
    categorias,
    
    endereco: a.endereco || '',
    numero: String(a.endereco_num || ''),
    complemento: a.complemento || '',
    cep: a.cep || '',
    bairro: a.nome_bairro || '',
    cidade: a.nome_cidade || '',
    estado: a.nome_estado || '',
    pais: a.nome_pais || '',
    empreendimento: a.nome_empreendimento || '',
    endereco_completo: a.endereco_completo || '',
    lat: a.lat || null,
    lng: a.lng || null,
    
    valor_venda: parseFloat(a.valor_venda) || 0,
    valor_locacao: parseFloat(a.valor_locacao) || 0,
    valor_temporada: parseFloat(a.valor_temporada) || 0,
    valor_condominio: parseFloat(a.valor_condominio) || 0,
    valor_iptu: parseFloat(a.valor_iptu) || 0,
    valor_seguro_incendio: parseFloat(a.valor_segincendio) || 0,
    valor_desconto: parseFloat(a.valor_desconto) || 0,
    taxa_adm_mensal: parseFloat(a.taxa_adm_mensal) || 0,
    taxa_locacao: parseFloat(a.taxa_locacao) || 0,
    taxa_venda: parseFloat(a.taxa_venda) || 0,
    
    saldo_devedor: parseFloat(a.finan_saldo_devedor) || 0,
    valor_prestacao: parseFloat(a.finan_valor_prestacao) || 0,
    
    area_util: parseFloat(a.area_util) || 0,
    area_total: parseFloat(a.area_total) || 0,
    area_construida: parseFloat(a.area_construida) || 0,
    area_terreno_total: parseFloat(a.area_terreno_total) || 0,
    area_terreno_frente: parseFloat(a.area_terreno_frente) || 0,
    area_terreno_fundos: parseFloat(a.area_terreno_fundos) || 0,
    area_terreno_esquerdo: parseFloat(a.area_terreno_esquerdo) || 0,
    area_terreno_direito: parseFloat(a.area_terreno_direito) || 0,
    area_comum: parseFloat(a.area_comum) || 0,
    area_garagem: parseFloat(a.area_garagem) || 0,
    area_privativa: parseFloat(a.area_privativa) || 0,
    
    quartos: a.quartos || 0,
    suites: a.suites || 0,
    banheiros: a.banheiros || 0,
    salas: a.salas || 0,
    garagens: a.garagens || 0,
    
    andar: a.andar || 0,
    num_andares: a.num_andares || 0,
    num_unidades_andar: a.num_unidades_andar || 0,
    num_torres: a.num_torres || 0,
    idade_construcao: a.idade ? String(a.idade) : '',
    
    proprietario_id: proprietarioId,
    proprietario_porcentagem: proprietarioPorcentagem,
    
    num_matricula: a.num_matricula || '',
    lote: a.lote || '',
    quadra: a.quadra || '',
    
    data_cadastro: a.criado || '',
    data_modificacao: a.modificado || '',
    data_captacao: a.data_captacao && a.data_captacao !== '0000-00-00' ? a.data_captacao : '',
    
    descricao: cleanHtml(a.descricao),
    observacoes: cleanHtml(a.observacoes),
    
    caracteristicas_imovel: caracImovel,
    caracteristicas_condominio: caracCond,
    caracteristicas_planta: caracPlanta,
    
    thumb: a.produto_thumb || '',
    imagens_urls: imagensUrls,
    total_imagens: totalImagens,
    
    video: a.video || '',
    
    corretores,
    url: a.url || '',
  };
}

// ============================================================
// Step 4: Generate Excel with multiple sheets
// ============================================================

function generateExcel(imoveis: FlatImovel[], outputPath: string) {
  const wb = XLSX.utils.book_new();

  // ===== Sheet 1: Dados Principais =====
  const mainHeaders = [
    'ID', 'Referência', 'Nome', 'Status', 'Publicado', 'Destaque', 'Quality Score',
    'Tipo', 'Finalidade', 'Categorias',
    'Endereço', 'Número', 'Complemento', 'CEP', 'Bairro', 'Cidade', 'Estado', 'País',
    'Empreendimento/Condomínio', 'Endereço Completo',
    'Valor Venda (R$)', 'Valor Locação (R$)', 'Valor Temporada (R$)',
    'Quartos', 'Suítes', 'Banheiros', 'Salas', 'Garagens',
    'Área Útil (m²)', 'Área Total (m²)', 'Área Construída (m²)', 'Área Terreno (m²)',
    'Andar', 'Nº Andares', 'Torres', 'Idade/Ano',
    'Proprietário ID', 'Proprietário %',
    'URL'
  ];

  const mainRows = imoveis.map(i => [
    i.id, i.referencia, i.nome, i.status, i.publicado, i.destaque, i.quality_score,
    i.tipo_imovel, i.finalidade, i.categorias,
    i.endereco, i.numero, i.complemento, i.cep, i.bairro, i.cidade, i.estado, i.pais,
    i.empreendimento, i.endereco_completo,
    i.valor_venda || '', i.valor_locacao || '', i.valor_temporada || '',
    i.quartos || '', i.suites || '', i.banheiros || '', i.salas || '', i.garagens || '',
    i.area_util || '', i.area_total || '', i.area_construida || '', i.area_terreno_total || '',
    i.andar || '', i.num_andares || '', i.num_torres || '', i.idade_construcao,
    i.proprietario_id, i.proprietario_porcentagem,
    i.url
  ]);

  const wsMain = XLSX.utils.aoa_to_sheet([mainHeaders, ...mainRows]);
  wsMain['!cols'] = mainHeaders.map((h) => ({ wch: Math.min(h.length + 5, 40) }));
  XLSX.utils.book_append_sheet(wb, wsMain, 'Dados Principais');

  // ===== Sheet 2: Financeiro & Despesas =====
  const finHeaders = [
    'ID', 'Referência', 'Tipo', 'Bairro', 'Empreendimento',
    'Valor Venda (R$)', 'Valor Locação (R$)', 'Valor Temporada (R$)', 'Desconto (R$)',
    'Condomínio (R$/mês)', 'IPTU (R$/mês)', 'Seguro Incêndio (R$)',
    'Taxa Adm Mensal (%)', 'Taxa Locação (%)', 'Taxa Venda (%)',
    'Saldo Devedor (R$)', 'Valor Prestação (R$)'
  ];

  const finRows = imoveis.map(i => [
    i.id, i.referencia, i.tipo_imovel, i.bairro, i.empreendimento,
    i.valor_venda || '', i.valor_locacao || '', i.valor_temporada || '', i.valor_desconto || '',
    i.valor_condominio || '', i.valor_iptu || '', i.valor_seguro_incendio || '',
    i.taxa_adm_mensal || '', i.taxa_locacao || '', i.taxa_venda || '',
    i.saldo_devedor || '', i.valor_prestacao || ''
  ]);

  const wsFin = XLSX.utils.aoa_to_sheet([finHeaders, ...finRows]);
  wsFin['!cols'] = finHeaders.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, wsFin, 'Financeiro e Despesas');

  // ===== Sheet 3: Áreas & Dimensões =====
  const areaHeaders = [
    'ID', 'Referência', 'Tipo',
    'Área Útil', 'Área Total', 'Área Construída', 'Área Privativa', 'Área Comum', 'Área Garagem',
    'Terreno Total', 'Terreno Frente', 'Terreno Fundos', 'Terreno Esq.', 'Terreno Dir.',
    'Latitude', 'Longitude'
  ];

  const areaRows = imoveis.map(i => [
    i.id, i.referencia, i.tipo_imovel,
    i.area_util || '', i.area_total || '', i.area_construida || '', i.area_privativa || '', i.area_comum || '', i.area_garagem || '',
    i.area_terreno_total || '', i.area_terreno_frente || '', i.area_terreno_fundos || '', i.area_terreno_esquerdo || '', i.area_terreno_direito || '',
    i.lat || '', i.lng || ''
  ]);

  const wsArea = XLSX.utils.aoa_to_sheet([areaHeaders, ...areaRows]);
  wsArea['!cols'] = areaHeaders.map(() => ({ wch: 16 }));
  XLSX.utils.book_append_sheet(wb, wsArea, 'Áreas e Dimensões');

  // ===== Sheet 4: Características =====
  const caracHeaders = [
    'ID', 'Referência', 'Tipo', 'Empreendimento',
    'Características do Imóvel',
    'Características do Condomínio/Acomodações',
    'Características da Planta',
    'Descrição', 'Observações'
  ];

  const caracRows = imoveis.map(i => [
    i.id, i.referencia, i.tipo_imovel, i.empreendimento,
    i.caracteristicas_imovel,
    i.caracteristicas_condominio,
    i.caracteristicas_planta,
    i.descricao?.slice(0, 500) || '',
    i.observacoes?.slice(0, 500) || ''
  ]);

  const wsCarac = XLSX.utils.aoa_to_sheet([caracHeaders, ...caracRows]);
  wsCarac['!cols'] = [
    { wch: 8 }, { wch: 10 }, { wch: 15 }, { wch: 25 },
    { wch: 60 }, { wch: 60 }, { wch: 40 },
    { wch: 80 }, { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(wb, wsCarac, 'Características');

  // ===== Sheet 5: Imagens =====
  const imgHeaders = [
    'ID', 'Referência', 'Tipo', 'Total Imagens', 'Thumbnail', 'URLs das Imagens', 'Vídeo'
  ];

  const imgRows = imoveis.map(i => [
    i.id, i.referencia, i.tipo_imovel, i.total_imagens,
    i.thumb, i.imagens_urls, i.video
  ]);

  const wsImg = XLSX.utils.aoa_to_sheet([imgHeaders, ...imgRows]);
  wsImg['!cols'] = [
    { wch: 8 }, { wch: 10 }, { wch: 15 }, { wch: 12 },
    { wch: 60 }, { wch: 100 }, { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(wb, wsImg, 'Imagens');

  // ===== Sheet 6: Proprietários =====
  const propHeaders = [
    'ID', 'Referência', 'Tipo', 'Bairro', 'Empreendimento',
    'Proprietário ID', 'Porcentagem (%)',
    'Matrícula', 'Lote', 'Quadra',
    'Corretores'
  ];

  const propRows = imoveis.map(i => [
    i.id, i.referencia, i.tipo_imovel, i.bairro, i.empreendimento,
    i.proprietario_id, i.proprietario_porcentagem,
    i.num_matricula, i.lote, i.quadra,
    i.corretores
  ]);

  const wsProp = XLSX.utils.aoa_to_sheet([propHeaders, ...propRows]);
  wsProp['!cols'] = propHeaders.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsProp, 'Proprietários');

  // Write file
  XLSX.writeFile(wb, outputPath);
  console.log(`\n📊 Excel gerado: ${outputPath}`);
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('🏠 Scraper Completo via API — rodrigomartinatti.com.br');
  console.log('=====================================================');
  console.log('⚠️  Modo: SOMENTE LEITURA (GET requests only)\n');

  // Step 1: Fetch all products
  const rawProducts = await fetchAllProducts();
  
  if (rawProducts.length === 0) {
    console.error('❌ Nenhum imóvel encontrado. Abortando.');
    return;
  }

  // Step 2: Transform into flat data
  console.log('🔄 Transformando dados...');
  const imoveis = rawProducts.map(p => transformProduct(p));

  // Step 3: Generate Excel
  const outputPath = path.resolve(process.cwd(), 'scratch', 'imoveis_rodrigo_martinatti_COMPLETO.xlsx');
  generateExcel(imoveis, outputPath);

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO DA EXTRAÇÃO');
  console.log('='.repeat(50));
  
  console.log(`\n🏠 Total de imóveis: ${imoveis.length}`);
  
  // Por tipo
  const tipos = new Map<string, number>();
  imoveis.forEach(i => tipos.set(i.tipo_imovel || 'Sem tipo', (tipos.get(i.tipo_imovel || 'Sem tipo') || 0) + 1));
  console.log('\n📋 Por tipo:');
  [...tipos.entries()].sort((a, b) => b[1] - a[1]).forEach(([tipo, count]) => 
    console.log(`  ${tipo}: ${count}`)
  );
  
  // Por finalidade
  const finalidades = new Map<string, number>();
  imoveis.forEach(i => finalidades.set(i.finalidade || 'Sem finalidade', (finalidades.get(i.finalidade || 'Sem finalidade') || 0) + 1));
  console.log('\n🎯 Por finalidade:');
  [...finalidades.entries()].sort((a, b) => b[1] - a[1]).forEach(([f, count]) => 
    console.log(`  ${f}: ${count}`)
  );

  // Por status
  const statuses = new Map<string, number>();
  imoveis.forEach(i => statuses.set(i.status || 'Sem status', (statuses.get(i.status || 'Sem status') || 0) + 1));
  console.log('\n📌 Por status:');
  [...statuses.entries()].sort((a, b) => b[1] - a[1]).forEach(([s, count]) => 
    console.log(`  ${s}: ${count}`)
  );

  // Por empreendimento (top 10)
  const empreendimentos = new Map<string, number>();
  imoveis.forEach(i => {
    if (i.empreendimento) {
      empreendimentos.set(i.empreendimento, (empreendimentos.get(i.empreendimento) || 0) + 1);
    }
  });
  console.log('\n🏗️ Top 10 Empreendimentos:');
  [...empreendimentos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([e, count]) => 
    console.log(`  ${e}: ${count}`)
  );

  // Stats
  const comPreco = imoveis.filter(i => i.valor_venda > 0);
  const comCondominio = imoveis.filter(i => i.valor_condominio > 0);
  const comIPTU = imoveis.filter(i => i.valor_iptu > 0);
  const comProprietario = imoveis.filter(i => i.proprietario_id);
  const comImagens = imoveis.filter(i => i.total_imagens > 0);
  const comCaracteristicas = imoveis.filter(i => i.caracteristicas_imovel);

  console.log('\n📈 Cobertura de dados:');
  console.log(`  💰 Com preço de venda: ${comPreco.length}/${imoveis.length}`);
  console.log(`  🏢 Com condomínio: ${comCondominio.length}/${imoveis.length}`);
  console.log(`  📋 Com IPTU: ${comIPTU.length}/${imoveis.length}`);
  console.log(`  👤 Com proprietário: ${comProprietario.length}/${imoveis.length}`);
  console.log(`  📸 Com imagens: ${comImagens.length}/${imoveis.length} (total: ${imoveis.reduce((s, i) => s + i.total_imagens, 0)} fotos)`);
  console.log(`  ✅ Com características: ${comCaracteristicas.length}/${imoveis.length}`);
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Extração concluída com sucesso!');
  console.log('='.repeat(50));
}

main().catch(console.error);
