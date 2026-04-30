/**
 * Fix: Atualiza as URLs das imagens de todos os imóveis do Rodrigo
 * 
 * Busca as URLs reais (imagemfull) diretamente da API Widesys
 * e atualiza o campo `fotos` de cada imóvel no Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const IMOBILIARIA_ID = 'c29bdff8-a01f-4406-8e0a-18536bd2dc88';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BASE_API = 'https://rodrigomartinatti.com.br/api/index.php/v1';
const AUTH = 'Basic ' + btoa('rodrigomartinatti@gmail.com:Vcpff0!@#');
const HEADERS = { 
  'Accept': 'application/vnd.api+json', 
  'Authorization': AUTH
};
const PAGE_SIZE = 50;

interface WidesysImage {
  id: number;
  nome: string;
  published: number;
  ordering: number;
  imagem: string;      // thumbnail (600x396)
  imagemfull: string;   // full resolution
}

async function fixImages() {
  console.log('🔧 Iniciando correção de URLs de imagens...\n');

  // 1. Fetch all products from API to get real image URLs
  console.log('📡 Buscando imóveis da API Widesys...');
  
  const firstRes = await fetch(`${BASE_API}/widesys/produtos?page[limit]=1`, { headers: HEADERS });
  const firstData = await firstRes.json();
  const totalItems = firstData.meta?.['total-items'] || 0;
  console.log(`   Total: ${totalItems} imóveis\n`);

  // Build a map: productId -> { images with full URLs }
  const imageMap = new Map<number, { fotos: any[] }>();
  let offset = 0;

  while (offset < totalItems) {
    const url = `${BASE_API}/widesys/produtos?page[limit]=${PAGE_SIZE}&page[offset]=${offset}`;
    console.log(`   → Buscando offset=${offset}...`);
    
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.error(`   ❌ Erro HTTP ${res.status}`);
      break;
    }
    
    const data = await res.json();
    if (!data.data || data.data.length === 0) break;
    
    for (const product of data.data) {
      const a = product.attributes;
      const productId = a.id;
      
      if (Array.isArray(a.imagens) && a.imagens.length > 0) {
        const fotos = a.imagens
          .filter((img: WidesysImage) => img.published === 1)
          .sort((a: WidesysImage, b: WidesysImage) => a.ordering - b.ordering)
          .map((img: WidesysImage, index: number) => ({
            id: `img-${productId}-${index}`,
            url_media: img.imagemfull || img.imagem,  // Full resolution preferred
            url_thumb: img.imagem || img.imagemfull,   // Thumbnail
            is_capa: index === 0,
            ordem: index,
            tipo: 'foto'
          }));
        
        imageMap.set(productId, { fotos });
      }
    }
    
    offset += PAGE_SIZE;
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n✅ ${imageMap.size} imóveis com imagens carregados da API\n`);

  // 2. Fetch our DB records and match by reference to get the widesys ID
  const { data: dbImoveis, error } = await supabase
    .from('imoveis')
    .select('id, referencia, fotos')
    .eq('imobiliaria_id', IMOBILIARIA_ID);

  if (error) {
    console.error('❌ Erro ao buscar imóveis do banco:', error);
    return;
  }

  console.log(`📦 ${dbImoveis?.length || 0} imóveis no banco de dados\n`);

  // 3. Update each property with correct image URLs
  let updated = 0;
  let skipped = 0;

  for (const dbImovel of dbImoveis || []) {
    // Extract the numeric ID from the reference (e.g., "AP463" -> 463, "CA123" -> 123)
    const refMatch = dbImovel.referencia?.match(/\d+/);
    if (!refMatch) {
      skipped++;
      continue;
    }
    
    const widesysId = parseInt(refMatch[0]);
    const imageData = imageMap.get(widesysId);
    
    if (!imageData || imageData.fotos.length === 0) {
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('imoveis')
      .update({ fotos: imageData.fotos })
      .eq('id', dbImovel.id);

    if (updateError) {
      console.error(`  ❌ Erro ao atualizar ${dbImovel.referencia}:`, updateError.message);
    } else {
      updated++;
    }
  }

  console.log(`\n🎉 Correção concluída!`);
  console.log(`   ✅ ${updated} imóveis atualizados com URLs corretas`);
  console.log(`   ⏭️  ${skipped} imóveis sem imagens ou não correspondidos`);
  
  // 4. Verify - sample a few
  const { data: sample } = await supabase
    .from('imoveis')
    .select('referencia, fotos')
    .eq('imobiliaria_id', IMOBILIARIA_ID)
    .limit(3);
  
  console.log('\n=== VERIFICAÇÃO ===');
  for (const s of sample || []) {
    const fotos = s.fotos as any[];
    if (fotos && fotos.length > 0) {
      console.log(`${s.referencia}: ${fotos.length} fotos, URL: ${fotos[0].url_media?.substring(0, 80)}...`);
    } else {
      console.log(`${s.referencia}: sem fotos`);
    }
  }
}

fixImages().catch(console.error);
