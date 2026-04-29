/**
 * Scraper de Imóveis — rodrigomartinatti.com.br
 * 
 * Coleta todos os imóveis do site público e gera um Excel.
 * Etapas:
 *   1. Varre as páginas de listagem para coletar URLs de detalhe
 *   2. Acessa cada página de detalhe e extrai os campos
 *   3. Gera um .xlsx com todos os dados
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://rodrigomartinatti.com.br';
const LIST_URL = `${BASE_URL}/imoveis-venda`;
const DELAY_MS = 300; // Delay between requests to be polite

interface Imovel {
  referencia: string;
  tipo: string;
  titulo: string;
  finalidade: string;
  bairro: string;
  cidade: string;
  estado: string;
  preco: string;
  preco_numerico: number | null;
  dormitorios: number | null;
  suites: number | null;
  vagas: number | null;
  banheiros: number | null;
  area_construida: string;
  area_terreno: string;
  descricao: string;
  caracteristicas_imovel: string;
  caracteristicas_condominio: string;
  url: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// Step 1: Collect all property detail URLs from listing pages
// ============================================================

async function collectPropertyUrls(): Promise<string[]> {
  const urls = new Set<string>();
  let limitstart = 0;
  let hasMore = true;
  const PAGE_SIZE = 20; // Joomla/Widesys uses limitstart with 20 per page

  console.log('📋 Coletando URLs das listagens...');

  while (hasMore) {
    const listUrl = limitstart === 0 ? LIST_URL : `${LIST_URL}?limitstart=${limitstart}`;
    console.log(`  → Página limitstart=${limitstart}...`);

    try {
      const response = await fetch(listUrl);
      const html = await response.text();

      // Extract property detail URLs using regex
      // Pattern: /imoveis-venda/NNN-slug-REFXXX
      const linkRegex = /href="(\/imoveis-venda\/\d+-[^"#?]+)"/g;
      let match;
      const prevSize = urls.size;

      while ((match = linkRegex.exec(html)) !== null) {
        const urlPath = match[1];
        const fullUrl = `${BASE_URL}${urlPath}`;
        urls.add(fullUrl);
      }

      const countNew = urls.size - prevSize;
      console.log(`    ✅ ${countNew} novos imóveis encontrados (total: ${urls.size})`);

      // Check if there's a next page
      if (countNew === 0) {
        hasMore = false;
      } else {
        limitstart += PAGE_SIZE;
        await sleep(DELAY_MS);
      }

      // Safety: stop if we've gone through too many pages
      if (limitstart > 500) {
        console.log('  ⚠️ Safety limit reached');
        hasMore = false;
      }
    } catch (error) {
      console.error(`  ❌ Erro na página ${limitstart}:`, error);
      hasMore = false;
    }
  }

  return Array.from(urls);
}

// ============================================================
// Step 2: Extract property details from a detail page
// ============================================================

async function extractPropertyDetails(url: string): Promise<Imovel | null> {
  try {
    const response = await fetch(url);
    const html = await response.text();

    // Extract REF from URL
    const refMatch = url.match(/([A-Z]{2}\d+)$/i);
    const referencia = refMatch ? refMatch[1].toUpperCase() : '';

    // Extract type and title from the page title or og:title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const fullTitle = titleMatch ? titleMatch[1].replace('Rodrigo Martinatti - ', '').trim() : '';

    // Extract tipo from title
    const tipoMatch = fullTitle.match(/^(Casa em Condomínio|Casa|Apartamento|Terreno|Chácara|Sala Comercial|Lote|Barracão|Galpão|Sobrado|Kitnet|Flat|Cobertura)/i);
    const tipo = tipoMatch ? tipoMatch[1] : '';

    // Extract finalidade from title  
    const finalidadeMatch = fullTitle.match(/para\s+(venda|locação|aluguel|venda e aluguel|venda e locação)/i);
    const finalidade = finalidadeMatch ? finalidadeMatch[1] : 'venda';

    // Extract bairro/cidade from title
    // Pattern: "... Bairro, Cidade"
    const locationMatch = fullTitle.match(/,\s+([^,]+),\s+(\w+)$/);
    const bairro = locationMatch ? locationMatch[1].trim() : '';
    const cidade = locationMatch ? locationMatch[2].trim() : 'Indaiatuba';

    // Extract price
    const priceMatch = html.match(/R\$\s*([\d.,]+)/);
    const preco = priceMatch ? `R$ ${priceMatch[1]}` : '';
    let precoNumerico: number | null = null;
    if (priceMatch) {
      precoNumerico = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // Extract description from og:description or meta description
    const descMatch = html.match(/<meta\s+(?:property="og:description"|name="description")\s+content="([^"]+)"/i);
    const descricao = descMatch ? descMatch[1].trim() : '';

    // Extract bedroom count - look for "Dormitório" pattern
    const dormMatch = html.match(/(\d+)\s*(?:<\/span>)?\s*(?:<span[^>]*>)?\s*(?:Dormitório|quarto)/i);
    const dormitorios = dormMatch ? parseInt(dormMatch[1]) : null;

    // Also check for "X quarto(s)" in the title
    const quartosMatch = fullTitle.match(/(\d+)\s*quarto/i);
    const dormFinal = dormitorios || (quartosMatch ? parseInt(quartosMatch[1]) : null);

    // Extract suites
    const suiteMatch = html.match(/(\d+)\s*(?:suíte|suite)/i);
    const suites = suiteMatch ? parseInt(suiteMatch[1]) : null;

    // Also check the "sendo X suítes" pattern
    const sendoSuiteMatch = html.match(/sendo\s+(\d+)\s+su[ií]te/i);
    const suitesFinal = suites || (sendoSuiteMatch ? parseInt(sendoSuiteMatch[1]) : null);

    // Extract vagas
    const vagasMatch = html.match(/(\d+)\s*(?:<\/span>)?\s*(?:<span[^>]*>)?\s*(?:Vaga|vagas)/i);
    const vagas = vagasMatch ? parseInt(vagasMatch[1]) : null;

    // Extract banheiros
    const banhMatch = html.match(/(\d+)\s*(?:<\/span>)?\s*(?:<span[^>]*>)?\s*(?:Banheiro|banheiros)/i);
    const banheiros = banhMatch ? parseInt(banhMatch[1]) : null;

    // Extract area (construída and terreno)
    const areaConstruidaMatch = html.match(/(\d+[\d.]*)\s*m²/);
    const areaConstruida = areaConstruidaMatch ? `${areaConstruidaMatch[1]} m²` : '';

    // Look for "terreno" area in the structured section
    // On the detail page: first number is area construída, second is area terreno
    const areaMatches = html.match(/(\d+[\d.,]*)\s*m²/g);
    let areaTerreno = '';
    if (areaMatches && areaMatches.length >= 2) {
      areaTerreno = areaMatches[1].trim();
    }

    // Extract characteristics (li items in characteristics section)
    const caracImovelMatch = html.match(/Características do Imóvel[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
    let caracImovel = '';
    if (caracImovelMatch) {
      const items = caracImovelMatch[1].match(/<li[^>]*>([^<]+)<\/li>/gi);
      if (items) {
        caracImovel = items.map(i => i.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(', ');
      }
    }

    // Fallback: try to get characteristics from text patterns
    if (!caracImovel) {
      const caracSection = html.match(/Características do Imóvel([\s\S]*?)(?:Características do Condomínio|Localização|<\/section)/i);
      if (caracSection) {
        const items = caracSection[1].match(/<span[^>]*>([^<]+)<\/span>/g);
        if (items) {
          caracImovel = items.map(i => i.replace(/<[^>]+>/g, '').trim()).filter(x => x && x.length > 2 && !x.includes('class')).join(', ');
        }
      }
    }

    const caracCondMatch = html.match(/Características do Condomínio[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
    let caracCond = '';
    if (caracCondMatch) {
      const items = caracCondMatch[1].match(/<li[^>]*>([^<]+)<\/li>/gi);
      if (items) {
        caracCond = items.map(i => i.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(', ');
      }
    }

    // Better bairro extraction from structured data
    let bairroFinal = bairro;
    if (!bairroFinal) {
      // Try to get from the title pattern "Tipo para finalidade, Bairro, Cidade"
      const bairroMatch2 = fullTitle.match(/,\s+([^,]+?),\s+Indaiatuba/i);
      if (bairroMatch2) bairroFinal = bairroMatch2[1].trim();
    }

    return {
      referencia,
      tipo,
      titulo: fullTitle,
      finalidade,
      bairro: bairroFinal,
      cidade: 'Indaiatuba',
      estado: 'SP',
      preco,
      preco_numerico: precoNumerico,
      dormitorios: dormFinal,
      suites: suitesFinal,
      vagas,
      banheiros,
      area_construida: areaConstruida,
      area_terreno: areaTerreno,
      descricao,
      caracteristicas_imovel: caracImovel,
      caracteristicas_condominio: caracCond,
      url
    };
  } catch (error) {
    console.error(`  ❌ Erro ao processar ${url}:`, error);
    return null;
  }
}

// ============================================================
// Step 3: Generate Excel
// ============================================================

function generateExcel(imoveis: Imovel[], outputPath: string) {
  const headers = [
    'Referência', 'Tipo', 'Título', 'Finalidade',
    'Bairro', 'Cidade', 'Estado',
    'Preço', 'Preço (número)',
    'Dormitórios', 'Suítes', 'Vagas', 'Banheiros',
    'Área Construída', 'Área Terreno',
    'Descrição',
    'Características do Imóvel', 'Características do Condomínio',
    'URL'
  ];

  const rows = imoveis.map(i => [
    i.referencia, i.tipo, i.titulo, i.finalidade,
    i.bairro, i.cidade, i.estado,
    i.preco, i.preco_numerico,
    i.dormitorios, i.suites, i.vagas, i.banheiros,
    i.area_construida, i.area_terreno,
    i.descricao,
    i.caracteristicas_imovel, i.caracteristicas_condominio,
    i.url
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Auto-width columns
  const colWidths = headers.map((h, idx) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => String(r[idx] || '').length)
    );
    return { wch: Math.min(maxLen + 2, 60) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Imóveis');

  XLSX.writeFile(wb, outputPath);
  console.log(`\n📊 Excel gerado: ${outputPath}`);
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('🏠 Scraper de Imóveis — rodrigomartinatti.com.br');
  console.log('================================================\n');

  // Step 1: Collect URLs
  const urls = await collectPropertyUrls();
  console.log(`\n📋 Total de URLs coletadas: ${urls.length}\n`);

  if (urls.length === 0) {
    console.error('❌ Nenhuma URL encontrada. Abortando.');
    return;
  }

  // Step 2: Extract details from each page
  const imoveis: Imovel[] = [];
  let processed = 0;

  for (const url of urls) {
    processed++;
    console.log(`  [${processed}/${urls.length}] ${url.split('/').pop()?.slice(0, 60)}...`);

    const details = await extractPropertyDetails(url);
    if (details) {
      imoveis.push(details);
    }

    // Be polite
    if (processed % 5 === 0) await sleep(DELAY_MS);
  }

  console.log(`\n✅ ${imoveis.length} imóveis processados com sucesso`);

  // Step 3: Generate Excel
  const outputPath = path.resolve(process.cwd(), 'scratch', 'imoveis_rodrigo_martinatti.xlsx');
  generateExcel(imoveis, outputPath);

  // Print summary
  const tipos = new Map<string, number>();
  imoveis.forEach(i => tipos.set(i.tipo, (tipos.get(i.tipo) || 0) + 1));
  
  console.log('\n📊 Resumo por tipo:');
  tipos.forEach((count, tipo) => console.log(`  ${tipo}: ${count}`));

  const comPreco = imoveis.filter(i => i.preco_numerico);
  console.log(`\n💰 ${comPreco.length} imóveis com preço identificado`);
  console.log(`📐 ${imoveis.filter(i => i.dormitorios).length} com dormitórios identificados`);
}

main().catch(console.error);
