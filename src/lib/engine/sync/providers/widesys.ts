import { supabaseAdmin } from '@/lib/supabase';
import { ImobiliariaIntegracao, Imovel } from '@/lib/database.types';

export async function syncWidesys(config: ImobiliariaIntegracao): Promise<any> {
  const { url, username, password } = config.config;

  if (!url || !username || !password) {
    throw new Error('Configuração Widesys incompleta. É necessário url, username e password.');
  }

  const BASE_API = url.endsWith('/') ? url.slice(0, -1) : url;
  const AUTH = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  const HEADERS = { 
    'Accept': 'application/vnd.api+json', 
    'Authorization': AUTH
  };
  const PAGE_SIZE = 50;

  // 1. Fetch total count
  const firstRes = await fetch(`${BASE_API}/widesys/produtos?page[limit]=1`, { headers: HEADERS });
  if (!firstRes.ok) {
    throw new Error(`Falha ao conectar com API Widesys: ${firstRes.status} ${firstRes.statusText}`);
  }
  const firstData = await firstRes.json();
  const totalItems = firstData.meta?.['total-items'] || 0;

  console.log(`Widesys Sync: Encontrados ${totalItems} imóveis na API externa.`);

  let offset = 0;
  const allExternalRefs = new Set<string>();
  let totalInserted = 0;
  let totalUpdated = 0;

  // Get current active properties for this imobiliaria to compare later
  const { data: currentProperties } = await supabaseAdmin
    .from('imoveis')
    .select('id, referencia')
    .eq('imobiliaria_id', config.imobiliaria_id)
    .in('status', ['disponivel', 'em_reforma', 'alugado']);

  const currentActiveRefs = new Set(currentProperties?.map(p => p.referencia) || []);

  // 2. Paginate through all properties
  while (offset < totalItems) {
    const pageUrl = `${BASE_API}/widesys/produtos?page[limit]=${PAGE_SIZE}&page[offset]=${offset}`;
    const res = await fetch(pageUrl, { headers: HEADERS });
    
    if (!res.ok) {
      console.error(`Widesys Sync: Erro HTTP ${res.status} no offset ${offset}`);
      break;
    }
    
    const data = await res.json();
    if (!data.data || data.data.length === 0) break;
    
    const upsertPayloads = data.data.map((raw: any) => transformToImovel(raw, config.imobiliaria_id));
    
    // Upsert into Supabase (Requires `referencia` to be uniquely constrained per imobiliaria, or we do a manual check)
    // To handle upsert without a unique constraint on (imobiliaria_id, referencia) in the DB schema out-of-the-box,
    // we iterate or use a match query. For safety, let's process one by one or fetch existing IDs.
    
    for (const imovel of upsertPayloads) {
      allExternalRefs.add(imovel.referencia);
      
      const isPublished = imovel.status !== 'indisponivel'; // transformed status

      const { data: existing } = await supabaseAdmin
        .from('imoveis')
        .select('id')
        .eq('imobiliaria_id', config.imobiliaria_id)
        .eq('referencia', imovel.referencia)
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabaseAdmin
          .from('imoveis')
          .update(imovel)
          .eq('id', existing.id);
        if (error) console.error(`Erro ao atualizar imóvel ${imovel.referencia}:`, error);
        else totalUpdated++;
      } else if (isPublished) {
        // Insert only if published
        const { error } = await supabaseAdmin
          .from('imoveis')
          .insert(imovel);
        if (error) console.error(`Erro ao inserir imóvel ${imovel.referencia}:`, error);
        else totalInserted++;
      }
    }

    offset += PAGE_SIZE;
  }

  // 3. Handle deactivated properties (in DB but not returned by API or returned as unpublished)
  let totalDeactivated = 0;
  const refsToDeactivate = [...currentActiveRefs].filter(ref => !allExternalRefs.has(ref));
  
  if (refsToDeactivate.length > 0) {
    const { error } = await supabaseAdmin
      .from('imoveis')
      .update({ status: 'indisponivel' })
      .eq('imobiliaria_id', config.imobiliaria_id)
      .in('referencia', refsToDeactivate);
      
    if (error) {
      console.error('Erro ao desativar imóveis ausentes:', error);
    } else {
      totalDeactivated = refsToDeactivate.length;
    }
  }

  return {
    provider: config.provider,
    totalFetched: totalItems,
    totalInserted,
    totalUpdated,
    totalDeactivated,
    success: true
  };
}

function transformToImovel(raw: any, imobiliaria_id: string): Partial<Imovel> {
  const a = raw.attributes;
  
  // Imagens
  let fotos: any[] = [];
  if (Array.isArray(a.imagens)) {
    fotos = a.imagens
      .filter((img: any) => img.published === 1)
      .map((img: any, idx: number) => ({
        url_media: img.url || img.nome,
        ordem: idx,
        is_capa: idx === 0,
        tipo_media: 'imagem'
      }));
  }

  // Categorias -> Pontos de Venda
  let pontos_venda: string[] = [];
  if (Array.isArray(a.categorias)) {
    pontos_venda = a.categorias.map((c: any) => c.title);
  }

  // Clean HTML
  const cleanHtml = (str: string) => str ? str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;

  // Determine Finalidade
  let finalidade: any = 'venda';
  if (a.finalidade) {
    const f = a.finalidade.toLowerCase();
    if (f.includes('venda') && f.includes('loca')) finalidade = 'venda_e_aluguel';
    else if (f.includes('loca') || f.includes('alugu')) finalidade = 'aluguel';
    else if (f.includes('tempo')) finalidade = 'temporada';
  }

  // Determine Tipo
  let tipo = 'casa'; // Default
  if (a.nome_tipo) {
    const t = a.nome_tipo.toLowerCase();
    if (t.includes('apartamento')) tipo = 'apartamento';
    else if (t.includes('cobertura')) tipo = 'cobertura';
    else if (t.includes('sobrado')) tipo = 'sobrado';
    else if (t.includes('terreno') || t.includes('lote')) tipo = 'terreno';
    else if (t.includes('chacara') || t.includes('sítio')) tipo = 'chacara';
    else if (t.includes('galpao')) tipo = 'galpao';
    else if (t.includes('comercial')) tipo = 'sala_comercial';
  }

  // Map fields
  return {
    imobiliaria_id,
    origin_provider: 'widesys',
    origin_id: String(a.id),
    referencia: a.referencia || '',
    titulo: a.nome || '',
    descricao: cleanHtml(a.descricao),
    
    tipo: tipo as any,
    finalidade,
    status: (a.published === 1 || a.published === true) ? 'disponivel' : 'indisponivel',
    
    codigo_postal: a.cep || '',
    rua: a.endereco || '',
    numero: String(a.endereco_num || ''),
    complemento: String(a.complemento || ''),
    freguesia: a.nome_bairro || '',
    concelho: a.nome_cidade || '',
    distrito: a.nome_estado || '',
    pais: 'BR', // Ou a.nome_pais se for garantir
    latitude: parseFloat(a.lat) || null,
    longitude: parseFloat(a.lng) || null,
    
    valor: parseFloat(a.valor_venda) || 0,
    valor_locacao: parseFloat(a.valor_locacao) || null,
    condominio_mensal: parseFloat(a.valor_condominio) || null,
    imi_iptu_anual: parseFloat(a.valor_iptu) || null,
    seguro_incendio_mensal: parseFloat(a.valor_segincendio) || null,
    
    area_util: parseFloat(a.area_util) || null,
    area_bruta: parseFloat(a.area_total) || null,
    area_construida: parseFloat(a.area_construida) || null,
    area_terreno: parseFloat(a.area_terreno_total) || null,
    
    quartos: a.quartos || null,
    suites: a.suites || null,
    casas_banho: a.banheiros || null,
    vagas_garagem: a.garagens || null,
    
    fotos,
    video_url: a.video || null,
    tour_360_url: null, // If available
    
    pontos_venda
  };
}
