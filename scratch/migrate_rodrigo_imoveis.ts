import * as xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!; 
const IMOBILIARIA_ID = 'c29bdff8-a01f-4406-8e0a-18536bd2dc88';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TIPO_MAP: Record<string, string> = {
  'Apartamento': 'apartamento',
  'Apartamento Duplex': 'apartamento_duplex',
  'Cobertura': 'cobertura',
  'Kitnet': 'kitnet',
  'Flat': 'flat',
  'Casa': 'casa',
  'Casa em Condomínio': 'casa_condominio',
  'Sobrado': 'sobrado',
  'Chácara': 'chacara',
  'Sítio': 'sitio',
  'Fazenda': 'fazenda',
  'Terreno': 'terreno',
  'Lote': 'lote',
  'Sala Comercial': 'sala_comercial',
  'Loja': 'loja',
  'Escritório': 'escritorio',
  'Galpão': 'galpao',
  'Barracão': 'barracao',
  'Garagem': 'garagem',
  'Armazém': 'armazem',
};

const STATUS_MAP: Record<string, string> = {
  'Disponível': 'disponivel',
  'Reservado': 'reservado',
  'Vendido': 'vendido',
  'Alugado': 'alugado',
  'Arrendado': 'arrendado',
  'Indisponível': 'indisponivel',
  'Em Reforma': 'em_reforma',
  'Retirado': 'retirado',
};

const FINALIDADE_MAP: Record<string, string> = {
  'Venda': 'venda',
  'Locação': 'aluguel',
  'Venda e Locação': 'venda_e_aluguel',
  'Temporada': 'temporada',
};

async function migrate() {
  console.log('🚀 Iniciando migração de imóveis...');

  // 1. Delete existing properties
  console.log(`🗑️ Removendo imóveis antigos da imobiliária ${IMOBILIARIA_ID}...`);
  const { error: delError } = await supabase
    .from('imoveis')
    .delete()
    .eq('imobiliaria_id', IMOBILIARIA_ID);

  if (delError) {
    console.error('❌ Erro ao deletar imóveis:', delError);
    return;
  }
  console.log('✅ Imóveis antigos removidos.');

  // 2. Load Excel & Maps
  const workbook = xlsx.readFile('scratch/imoveis_rodrigo_martinatti_COMPLETO.xlsx');
  const ownersMap = JSON.parse(fs.readFileSync('scratch/owners_map.json', 'utf8'));
  
  const mainSheet = xlsx.utils.sheet_to_json(workbook.Sheets['Dados Principais']) as any[];
  const finSheet = xlsx.utils.sheet_to_json(workbook.Sheets['Financeiro e Despesas']) as any[];
  const areaSheet = xlsx.utils.sheet_to_json(workbook.Sheets['Áreas e Dimensões']) as any[];
  const caracSheet = xlsx.utils.sheet_to_json(workbook.Sheets['Características']) as any[];
  const imgSheet = xlsx.utils.sheet_to_json(workbook.Sheets['Imagens']) as any[];

  // Create maps for quick lookup by ID or Reference
  const finMap = new Map(finSheet.map(i => [i.ID, i]));
  const areaMap = new Map(areaSheet.map(i => [i.ID, i]));
  const caracMap = new Map(caracSheet.map(i => [i.ID, i]));
  const imgMap = new Map(imgSheet.map(i => [i.ID, i]));

  const imoveisToInsert: any[] = [];

  for (const row of mainSheet) {
    const id = row.ID;
    const fin = finMap.get(id) || {};
    const area = areaMap.get(id) || {};
    const carac = caracMap.get(id) || {};
    const img = imgMap.get(id) || {};

    const fotosRaw = img['URLs das Imagens'] ? img['URLs das Imagens'].split(' | ') : [];
    const fotos = fotosRaw.map((url: string, index: number) => ({
      id: `img-${id}-${index}`,
      url_media: url,
      url_thumb: url,
      is_capa: index === 0,
      ordem: index,
      tipo: 'foto'
    }));

    const imovel = {
      imobiliaria_id: IMOBILIARIA_ID,
      referencia: row['Referência'] || `RM-${id}`,
      titulo: row.Nome,
      pais: row['País'] === 'Brasil' ? 'BR' : 'PT',
      distrito: row.Estado || '',
      concelho: row.Cidade || '',
      freguesia: row.Bairro || '',
      rua: row['Endereço'] || null,
      numero: row['Número'] ? String(row['Número']) : null,
      complemento: row.Complemento || null,
      codigo_postal: row.CEP || null,
      latitude: area.Latitude || null,
      longitude: area.Longitude || null,
      
      tipo: TIPO_MAP[row.Tipo] || 'casa',
      finalidade: FINALIDADE_MAP[row.Finalidade] || 'venda',
      negocio: row.Categorias?.toLowerCase().includes('comercial') ? 'comercial' : 'residencial',
      empreendimento: row['Empreendimento/Condomínio'] || null,
      
      proprietario_nome: row['Proprietário ID'] ? (ownersMap[row['Proprietário ID']] || `Proprietário #${row['Proprietário ID']}`) : null,
      
      quartos: row.Quartos || null,
      suites: row.Suítes || null,
      casas_banho: row.Banheiros || null,
      salas: row.Salas || null,
      vagas_garagem: row.Garagens || 0,
      andar: row.Andar || null,
      num_andares: row['Nº Andares'] || null,
      num_torres: row.Torres || null,
      ano_construcao: row['Idade/Ano'] ? parseInt(row['Idade/Ano']) : null,
      
      area_bruta: row['Área Total (m²)'] || null,
      area_util: row['Área Útil (m²)'] || null,
      area_construida: row['Área Construída (m²)'] || null,
      area_privativa: area['Área Privativa'] || null,
      area_terreno: row['Área Terreno (m²)'] || null,
      
      comodidades: carac['Características do Imóvel'] ? carac['Características do Imóvel'].split(', ') : [],
      comodidades_condominio: carac['Características do Condomínio/Acomodações'] ? carac['Características do Condomínio/Acomodações'].split(', ') : [],
      
      valor: row['Valor Venda (R$)'] || 0,
      valor_locacao: row['Valor Locação (R$)'] || null,
      moeda: 'BRL',
      condominio_mensal: fin['Condomínio (R$/mês)'] || null,
      imi_iptu_anual: fin['IPTU (R$/mês)'] ? fin['IPTU (R$/mês)'] * 12 : null,
      seguro_incendio_mensal: fin['Seguro Incêndio (R$)'] || null,
      taxa_administracao_pct: fin['Taxa Adm Mensal (%)'] || null,
      
      descricao: carac.Descrição || null,
      status: STATUS_MAP[row.Status] || 'disponivel',
      video_url: img.Vídeo || null,
      fotos: fotos,
      data_captacao: new Date().toISOString(),
      origem_captacao: 'Widesys Rodrigo'
    };

    imoveisToInsert.push(imovel);
  }

  console.log(`📦 Preparados ${imoveisToInsert.length} imóveis para inserção...`);

  // Split into chunks to avoid request size limits
  const CHUNK_SIZE = 50;
  for (let i = 0; i < imoveisToInsert.length; i += CHUNK_SIZE) {
    const chunk = imoveisToInsert.slice(i, i + CHUNK_SIZE);
    console.log(`  → Inserindo lote ${i / CHUNK_SIZE + 1} (${chunk.length} imóveis)...`);
    const { error: insError } = await supabase.from('imoveis').insert(chunk);
    if (insError) {
      console.error('  ❌ Erro ao inserir lote:', insError);
    }
  }

  console.log('✅ Migração concluída!');
}

migrate().catch(console.error);
