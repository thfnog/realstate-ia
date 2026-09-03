import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getImovelRepository } from '@/lib/repositories/factory';
import * as mock from '@/lib/mockDb';
import type { Imovel } from '@/lib/database.types';

function escapeXml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(str: string | null | undefined): string {
  if (!str) return '';
  const sanitized = str.replace(/]]>/g, ']]&gt;');
  return `<![CDATA[${sanitized}]]>`;
}

function mapTipoZap(tipo: string): { tipo: string; subTipo: string; categoria: string } {
  switch (tipo) {
    case 'apartamento':
      return { tipo: 'Apartamento', subTipo: 'Padrão', categoria: 'Residencial' };
    case 'apartamento_duplex':
      return { tipo: 'Apartamento', subTipo: 'Duplex', categoria: 'Residencial' };
    case 'cobertura':
      return { tipo: 'Apartamento', subTipo: 'Cobertura', categoria: 'Residencial' };
    case 'kitnet':
    case 'flat':
      return { tipo: 'Apartamento', subTipo: 'Kitchenette/Conjugados', categoria: 'Residencial' };
    case 'casa':
    case 'sobrado':
      return { tipo: 'Casa', subTipo: 'Padrão', categoria: 'Residencial' };
    case 'casa_condominio':
      return { tipo: 'Casa', subTipo: 'Condomínio', categoria: 'Residencial' };
    case 'terreno':
    case 'lote':
      return { tipo: 'Terreno', subTipo: 'Padrão', categoria: 'Residencial' };
    case 'chacara':
    case 'sitio':
    case 'fazenda':
      return { tipo: 'Rural', subTipo: 'Chácara', categoria: 'Rural' };
    case 'sala_comercial':
    case 'escritorio':
      return { tipo: 'Comercial/Industrial', subTipo: 'Sala', categoria: 'Comercial' };
    case 'loja':
      return { tipo: 'Comercial/Industrial', subTipo: 'Loja', categoria: 'Comercial' };
    case 'galpao':
    case 'barracao':
    case 'armazem':
      return { tipo: 'Comercial/Industrial', subTipo: 'Galpão/Depósito/Armazém', categoria: 'Comercial' };
    default:
      return { tipo: 'Apartamento', subTipo: 'Padrão', categoria: 'Residencial' };
  }
}

function generateGrupoZapXml(imoveis: Imovel[], imobName: string): string {
  const imoveisXml = imoveis.map(imovel => {
    const { tipo, subTipo, categoria } = mapTipoZap(imovel.tipo);
    const precoVenda = imovel.valor > 0 ? `<PrecoVenda>${imovel.valor}</PrecoVenda>` : '';
    const precoLocacao = (imovel.valor_locacao && imovel.valor_locacao > 0) ? `<PrecoLocacao>${imovel.valor_locacao}</PrecoLocacao>` : '';
    const precoCondominio = (imovel.condominio_mensal && imovel.condominio_mensal > 0) ? `<PrecoCondominio>${imovel.condominio_mensal}</PrecoCondominio>` : '';
    const valorIPTU = (imovel.imi_iptu_anual && imovel.imi_iptu_anual > 0) ? `<ValorIPTU>${imovel.imi_iptu_anual}</ValorIPTU>` : '';

    const fotosXml = (imovel.fotos || []).map((foto, idx) => `
          <Foto>
            <NomeArquivo>${escapeXml(foto.legenda || `Foto ${idx + 1}`)}</NomeArquivo>
            <URLArquivo>${escapeXml(foto.url_original || foto.url_media || foto.url_thumb)}</URLArquivo>
            <Principal>${foto.is_capa || idx === 0 ? '1' : '0'}</Principal>
            <Ordem>${idx + 1}</Ordem>
          </Foto>`).join('');

    const comodidades = [...(imovel.comodidades || []), ...(imovel.comodidades_condominio || [])];
    const caracteristicasXml = comodidades.length > 0 ? `
        <Caracteristicas>
          ${comodidades.map(c => `<Caracteristica>${escapeXml(c)}</Caracteristica>`).join('\n          ')}
        </Caracteristicas>` : '';

    return `
      <Imovel>
        <CodigoImovel>${escapeXml(imovel.referencia || imovel.id)}</CodigoImovel>
        <TipoImovel>${escapeXml(tipo)}</TipoImovel>
        <SubTipoImovel>${escapeXml(subTipo)}</SubTipoImovel>
        <CategoriaImovel>${escapeXml(categoria)}</CategoriaImovel>
        <TituloImovel>${cdata(imovel.titulo)}</TituloImovel>
        <Observacao>${cdata(imovel.descricao || imovel.titulo)}</Observacao>
        ${precoVenda}
        ${precoLocacao}
        ${precoCondominio}
        ${valorIPTU}
        <Pais>${escapeXml(imovel.pais === 'PT' ? 'Portugal' : 'Brasil')}</Pais>
        <Estado>${escapeXml(imovel.distrito || 'SP')}</Estado>
        <Cidade>${escapeXml(imovel.concelho || 'São Paulo')}</Cidade>
        <Bairro>${escapeXml(imovel.freguesia || 'Centro')}</Bairro>
        <Endereco>${escapeXml(imovel.rua || '')}</Endereco>
        <Numero>${escapeXml(imovel.numero || '')}</Numero>
        <Complemento>${escapeXml(imovel.complemento || '')}</Complemento>
        <CEP>${escapeXml(imovel.codigo_postal || '')}</CEP>
        <Latitude>${imovel.latitude ?? ''}</Latitude>
        <Longitude>${imovel.longitude ?? ''}</Longitude>
        <AreaUtil>${imovel.area_util || imovel.area_privativa || ''}</AreaUtil>
        <AreaTotal>${imovel.area_bruta || imovel.area_construida || imovel.area_terreno || ''}</AreaTotal>
        <QtdDormitorios>${imovel.quartos || 0}</QtdDormitorios>
        <QtdSuites>${imovel.suites || 0}</QtdSuites>
        <QtdBanheiros>${imovel.casas_banho || 0}</QtdBanheiros>
        <QtdVagas>${imovel.vagas_garagem || 0}</QtdVagas>
        ${caracteristicasXml}
        <Fotos>${fotosXml}
        </Fotos>
      </Imovel>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Carga xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Imobiliaria>
    <Nome>${escapeXml(imobName)}</Nome>
    <DataHoraCarga>${new Date().toISOString()}</DataHoraCarga>
  </Imobiliaria>
  <Imoveis>${imoveisXml}
  </Imoveis>
</Carga>`;
}

function generateImovelwebXml(imoveis: Imovel[], imobName: string): string {
  const inmueblesXml = imoveis.map(imovel => {
    const { tipo } = mapTipoZap(imovel.tipo);
    const fotosXml = (imovel.fotos || []).map((foto, idx) => `
        <foto>
          <url>${escapeXml(foto.url_original || foto.url_media || foto.url_thumb)}</url>
          <orden>${idx + 1}</orden>
          <principal>${foto.is_capa || idx === 0 ? '1' : '0'}</principal>
        </foto>`).join('');

    return `
    <inmueble>
      <codigo>${escapeXml(imovel.referencia || imovel.id)}</codigo>
      <tipo>${escapeXml(tipo)}</tipo>
      <titulo>${cdata(imovel.titulo)}</titulo>
      <descripcion>${cdata(imovel.descricao || imovel.titulo)}</descripcion>
      <precio_venta>${imovel.valor || 0}</precio_venta>
      <precio_alquiler>${imovel.valor_locacao || 0}</precio_alquiler>
      <expensas_condominio>${imovel.condominio_mensal || 0}</expensas_condominio>
      <iptu>${imovel.imi_iptu_anual || 0}</iptu>
      <pais>${escapeXml(imovel.pais === 'PT' ? 'Portugal' : 'Brasil')}</pais>
      <provincia_estado>${escapeXml(imovel.distrito || 'SP')}</provincia_estado>
      <ciudad>${escapeXml(imovel.concelho || 'São Paulo')}</ciudad>
      <barrio>${escapeXml(imovel.freguesia || 'Centro')}</barrio>
      <calle>${escapeXml(imovel.rua || '')}</calle>
      <numero>${escapeXml(imovel.numero || '')}</numero>
      <codigo_postal>${escapeXml(imovel.codigo_postal || '')}</codigo_postal>
      <superficie_util>${imovel.area_util || 0}</superficie_util>
      <superficie_total>${imovel.area_bruta || imovel.area_construida || 0}</superficie_total>
      <dormitorios>${imovel.quartos || 0}</dormitorios>
      <suites>${imovel.suites || 0}</suites>
      <banos>${imovel.casas_banho || 0}</banos>
      <cocheras_garajes>${imovel.vagas_garagem || 0}</cocheras_garajes>
      <fotos>${fotosXml}
      </fotos>
    </inmueble>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<inmuebles>
  <proveedor>${escapeXml(imobName)}</proveedor>
  <fecha_generacion>${new Date().toISOString()}</fecha_generacion>${inmueblesXml}
</inmuebles>`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imobIdParam = searchParams.get('imob_id');
    const portal = (searchParams.get('portal') || 'grupozap').toLowerCase();

    // 1. Resolução da imobiliária
    let imobiliariaId = imobIdParam || mock.DEFAULT_IMOBILIARIA_ID;
    let imobName = 'ImobIA Imobiliária';

    if (!mock.isMockMode()) {
      if (imobIdParam) {
        const { data: imob } = await supabaseAdmin
          .from('imobiliarias')
          .select('id, nome_fantasia')
          .eq('id', imobIdParam)
          .single();
        if (imob) {
          imobiliariaId = imob.id;
          imobName = imob.nome_fantasia;
        }
      } else {
        const { data: imobs } = await supabaseAdmin
          .from('imobiliarias')
          .select('id, nome_fantasia')
          .limit(1);
        if (imobs && imobs.length > 0) {
          imobiliariaId = imobs[0].id;
          imobName = imobs[0].nome_fantasia;
        }
      }
    } else {
      const imob = mock.getImobiliariaById(imobiliariaId);
      if (imob) imobName = imob.nome_fantasia;
    }

    // 2. Busca de imóveis disponíveis
    const repository = getImovelRepository(supabaseAdmin);
    const { data: imoveis } = await repository.findAll({
      imobiliaria_id: imobiliariaId,
      status: 'disponivel',
      limit: 500
    });

    // 3. Geração do XML de acordo com o portal
    let xmlContent = '';
    if (portal === 'imovelweb') {
      xmlContent = generateImovelwebXml(imoveis, imobName);
    } else {
      // Padrão Grupo ZAP / VivaReal / OLX
      xmlContent = generateGrupoZapXml(imoveis, imobName);
    }

    return new Response(xmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        'X-Total-Count': String(imoveis.length),
        'X-Portal-Format': portal
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao gerar Feed XML de portais:', error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><erro><mensagem>${escapeXml(error.message || 'Erro ao gerar feed')}</mensagem></erro>`, {
      status: 500,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' }
    });
  }
}
