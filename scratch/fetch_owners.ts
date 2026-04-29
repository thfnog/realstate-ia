import * as fs from 'fs';

const BASE_API = 'https://rodrigomartinatti.com.br/api/index.php/v1';
const AUTH = 'Basic ' + btoa('rodrigomartinatti@gmail.com:Vcpff0!@#');
const HEADERS = { 
  'Accept': 'application/vnd.api+json', 
  'Authorization': AUTH
};

async function fetchProprietarios() {
  const map: Record<string, string> = {};
  console.log('📡 Buscando nomes dos proprietários...');
  
  try {
    let offset = 0;
    while (true) {
      const res = await fetch(`${BASE_API}/widesys/categories?page[limit]=100&page[offset]=${offset}&filter[extension]=com_widesys.proprietarios`, { headers: HEADERS });
      if (!res.ok) break;
      const data: any = await res.json();
      if (!data.data || data.data.length === 0) break;
      for (const item of data.data) {
        map[item.attributes.id] = item.attributes.title;
      }
      offset += 100;
      if (data.data.length < 100) break;
    }
    console.log(`✅ ${Object.keys(map).length} proprietários encontrados.`);
    fs.writeFileSync('scratch/owners_map.json', JSON.stringify(map, null, 2));
    console.log('📄 Mapa salvo em scratch/owners_map.json');
  } catch (e: any) {
    console.error('❌ Erro:', e.message);
  }
}

fetchProprietarios();
