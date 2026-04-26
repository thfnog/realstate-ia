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

const axiosInstance = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

async function getPropertyLinks() {
  const links: string[] = [];
  const categories = [
    { url: `${BASE_URL}/imoveis-venda`, pages: 8 },
    { url: `${BASE_URL}/imoveis-locacao`, pages: 2 },
    { url: `${BASE_URL}/lancamentos`, pages: 1 }
  ];

  for (const cat of categories) {
    for (let i = 0; i < cat.pages; i++) {
      const start = i * 21;
      try {
        const { data } = await axiosInstance.get(`${cat.url}?start=${start}`);
        const $ = cheerio.load(data);
        $('.featured-thumb a, .property-item a').each((_, el) => {
          const href = $(el).attr('href');
          if (href && (href.includes('/imoveis-') || href.includes('/locacao/') || href.includes('/empreendimentos/'))) {
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
    const { data: html } = await axiosInstance.get(url);
    const $ = cheerio.load(html);
    
    // Título extraído do H1 específico da página de detalhes
    let titulo = $('h1.text-secondary').first().text().trim();
    if (!titulo) titulo = $('h1').first().text().trim();
    
    let valorRaw = $('.price, h5, .valor-venda').text().replace(/[^\d]/g, '');
    let valor = parseInt(valorRaw) || 0;
    if (valor > 5000000 && valorRaw.endsWith('00')) valor = valor / 100;

    const scriptContent = $('script').text();
    const pointsMatch = scriptContent.match(/var\s+points\s*=\s*\[\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\]/);
    const latitude = pointsMatch ? parseFloat(pointsMatch[1]) : null;
    const longitude = pointsMatch ? parseFloat(pointsMatch[2]) : null;

    let area_util = 0;
    const areaMatch = html.match(/u00c1rea u00fatil<\/span>\s*<p><b>(\d+)/i) || html.match(/Área útil<\/span>\s*<p><b>(\d+)/i);
    if (areaMatch) area_util = parseInt(areaMatch[1]);

    let tipo = 'casa';
    const lowerTitle = titulo.toLowerCase();
    if (lowerTitle.includes('apartamento')) tipo = 'apartamento';
    else if (lowerTitle.includes('terreno')) tipo = 'terreno';

    const fotos: any[] = [];
    
    // Captura imagens do carrossel (Owl Lazy Load) e do Storage Widesys
    $('.owl-lazy, .carousel-item img, .item img').each((i, el) => {
      const src = $(el).attr('data-src') || $(el).attr('src');
      if (src && (src.includes('storage.widesys.com.br') || src.includes('/uploads/'))) {
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

    return { titulo, valor, area_util, tipo, latitude, longitude, fotos: fotos.slice(0, 30), descricao: $('.descricao-imovel').text().trim() || titulo };
  } catch (e) { return null; }
}

async function run() {
  console.log('🧹 Limpando banco de dados...');
  await supabase.from('imoveis').delete().eq('imobiliaria_id', IMOB_ID);
  const links = await getPropertyLinks();
  console.log(`📦 Importando ${links.length} imóveis (v6 Widesys Storage)...`);
  for (let i = 0; i < links.length; i++) {
    const prop = await scrapeProperty(links[i]);
    if (!prop || !prop.titulo) continue;
    await supabase.from('imoveis').insert({ imobiliaria_id: IMOB_ID, titulo: prop.titulo, tipo: prop.tipo, pais: 'BR', distrito: 'SP', concelho: 'Indaiatuba', freguesia: 'Centro', valor: prop.valor, moeda: 'BRL', area_util: prop.area_util, status: 'disponivel', finalidade: links[i].includes('/locacao/') ? 'arrendamento' : 'venda', negocio: 'residencial', fotos: prop.fotos, descricao: `${prop.descricao}\n\nOrigem: ${links[i]}`, latitude: prop.latitude, longitude: prop.longitude, origem_captacao: 'Migração v6' });
    if (i % 20 === 0) console.log(`🚀 ${i}/${links.length}...`);
  }
  console.log('✨ Migração concluída com fotos do Storage!');
}
run();
