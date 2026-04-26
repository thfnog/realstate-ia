import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const url = 'https://rodrigomartinatti.com.br/imoveis-venda/183-casa-em-condominio-para-venda-4-quarto-s-jardim-residencial-helvetia-park-i-indaiatuba-ca183';
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  
  const valorRaw = $('.price, h5').first().text().replace(/[^\d]/g, '');
  const areaText = $('li:contains("m²")').first().text();
  const areaMatch = areaText.match(/(\d+)/);
  
  const addressElement = $('.fa-map-marker-alt').first().parent();
  const addressText = addressElement.text().trim();
  const addressParts = addressText.split(',').map(s => s.trim());
  const indaiatubaIndex = addressParts.findIndex(p => p.includes('Indaiatuba'));
  const freguesia = indaiatubaIndex > 0 ? addressParts[indaiatubaIndex - 1] : 'Centro';

  console.log({
    url,
    valor: parseInt(valorRaw),
    area: areaMatch ? parseInt(areaMatch[1]) : 0,
    freguesia,
    addressText
  });
}

test();
