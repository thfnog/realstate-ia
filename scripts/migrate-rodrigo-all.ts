import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const IMOB_ID = 'c29bdff8-a01f-4406-8e0a-18536bd2dc88';
const BASE_URL = 'https://rodrigomartinatti.com.br';

async function getPropertyLinks() {
  const links: string[] = [];
  const categories = [
    { url: `${BASE_URL}/imoveis-venda`, pages: 10 },
    { url: `${BASE_URL}/imoveis-locacao`, pages: 1 },
    { url: `${BASE_URL}/lancamentos`, pages: 1 }
  ];

  for (const cat of categories) {
    console.log(`🔍 Buscando links em: ${cat.url}`);
    for (let i = 0; i < cat.pages; i++) {
      const start = i * 21;
      try {
        const { data } = await axios.get(`${cat.url}?start=${start}`);
        const $ = cheerio.load(data);
        $('.featured-thumb a').each((_, el) => {
          const href = $(el).attr('href');
          if (href && (href.includes('/imoveis-venda/') || href.includes('/locacao/') || href.includes('/empreendimentos/'))) {
            links.push(href.startsWith('http') ? href : `${BASE_URL}${href}`);
          }
        });
      } catch (e) {}
    }
  }
  return [...new Set(links)]; 
}

async function scrapeProperty(url: string) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    
    const titulo = $('h1').first().text().trim();
    
    // Pegar o preço e tratar centavos
    let valorRaw = $('.price, h5').first().text().replace(/[^\d]/g, '');
    let valor = parseInt(valorRaw) || 0;
    if (valor > 100000000 && valorRaw.endsWith('00')) {
        valor = valor / 100; // Remove centavos
    }
    
    const scriptContent = $('script').text();
    const pointsMatch = scriptContent.match(/var\s+points\s*=\s*\[\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\]/);
    const latitude = pointsMatch ? parseFloat(pointsMatch[1]) : null;
    const longitude = pointsMatch ? parseFloat(pointsMatch[2]) : null;

    // Área: Buscar qualquer li que tenha m2 ou m²
    let area_util = 0;
    $('li').each((_, el) => {
       const txt = $(el).text().toLowerCase();
       if (txt.includes('m²') || txt.includes('m2')) {
          const match = txt.match(/(\d+)/);
          if (match) {
             area_util = parseInt(match[1]);
             return false; // break
          }
       }
    });
    
    const quartosMatch = $('li:contains("quarto")').first().text().match(/(\d+)/);
    const quartos = quartosMatch ? parseInt(quartosMatch[1]) : 0;

    // Extração precisa da Freguesia (Bairro) via ícone de mapa
    const addressElement = $('.fa-map-marker-alt').first().parent();
    const addressText = addressElement.text().trim();
    const addressParts = addressText.split(',').map(s => s.trim());
    const indaiatubaIndex = addressParts.findIndex(p => p.includes('Indaiatuba'));
    const freguesia = indaiatubaIndex > 0 ? addressParts[indaiatubaIndex - 1] : 'Centro';

    const fotos: any[] = [];
    $('img').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && (src.includes('/uploads/imoveis/') || src.includes('/uploads/empreendimentos/'))) {
        const fullSrc = src.startsWith('http') ? src : `${BASE_URL}${src}`;
        if (!fotos.find(f => f.url_media.includes(encodeURIComponent(fullSrc)))) {
            fotos.push({
              url_media: `/api/proxy/image?url=${encodeURIComponent(fullSrc)}`,
              is_capa: fotos.length === 0,
              tipo: 'foto'
            });
        }
      }
    });

    return {
      titulo,
      valor,
      area_util,
      quartos,
      latitude,
      longitude,
      freguesia,
      fotos: fotos.slice(0, 10),
      descricao: $('.description, .property-description').text().trim() || titulo,
      url
    };
  } catch (e) {
    return null;
  }
}

async function run() {
  console.log('🧹 Limpando imobiliária...');
  await supabase.from('imoveis').delete().eq('imobiliaria_id', IMOB_ID);

  const links = await getPropertyLinks();
  console.log(`📦 Encontrados: ${links.length} imóveis.`);

  const statsByRegion: Record<string, { sum: number, count: number }> = {};

  for (let i = 0; i < links.length; i++) {
    const prop = await scrapeProperty(links[i]);
    if (!prop || !prop.titulo) continue;

    // Lógica de Média de Mercado por Bairro (Freguesia)
    if (prop.area_util > 10 && prop.valor > 10000) {
      const pricePerM2 = prop.valor / prop.area_util;
      if (pricePerM2 > 500 && pricePerM2 < 50000) { // Filtro de sanidade
          if (!statsByRegion[prop.freguesia]) statsByRegion[prop.freguesia] = { sum: 0, count: 0 };
          statsByRegion[prop.freguesia].sum += pricePerM2;
          statsByRegion[prop.freguesia].count += 1;
      }
    }

    await supabase.from('imoveis').insert({
      imobiliaria_id: IMOB_ID,
      titulo: prop.titulo,
      tipo: links[i].includes('/apartamento') ? 'apartamento' : 'casa',
      pais: 'BR',
      distrito: 'SP',
      concelho: 'Indaiatuba',
      freguesia: prop.freguesia,
      valor: prop.valor,
      moeda: 'BRL',
      area_util: prop.area_util,
      quartos: prop.quartos,
      status: 'disponivel',
      finalidade: links[i].includes('/locacao/') ? 'arrendamento' : 'venda',
      negocio: 'residencial',
      fotos: prop.fotos,
      descricao: `${prop.descricao}\n\nOrigem: ${links[i]}`,
      latitude: prop.latitude,
      longitude: prop.longitude,
      origem_captacao: 'Migração Rodrigo Martinatti'
    });

    if (i % 20 === 0) console.log(`🚀 Progresso: ${i}/${links.length}...`);
  }

  console.log('\n📊 MÉDIAS POR BAIRRO CALCULADAS:');
  const finalStats = Object.entries(statsByRegion)
    .filter(([_, s]) => s.count >= 2) // Mínimo de 2 amostras para ter média
    .map(([regiao, stat]) => ({
      Região: regiao,
      Media_m2: Math.round(stat.sum / stat.count)
    }))
    .sort((a, b) => b.Media_m2 - a.Media_m2);
  
  console.table(finalStats);
  console.log('✨ Migração concluída com sucesso!');
}

run();
