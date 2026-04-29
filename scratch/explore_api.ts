// Deep exploration of Widesys API to find all available fields
const BASE_API = 'https://rodrigomartinatti.com.br/api/index.php/v1';
const headers = { 
  'Accept': 'application/vnd.api+json', 
  'Authorization': 'Basic ' + btoa('rodrigomartinatti@gmail.com:Vcpff0!@#')
};

async function fetchJson(path: string) {
  const res = await fetch(`${BASE_API}${path}`, { headers });
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  // 1. Get first product with ALL fields
  console.log('=== FIRST PRODUCT - ALL ATTRIBUTES ===\n');
  const firstPage = await fetchJson('/widesys/produtos?page[limit]=1');
  if (firstPage?.data?.[0]) {
    const attrs = firstPage.data[0].attributes;
    const allKeys = Object.keys(attrs);
    console.log(`Total fields: ${allKeys.length}\n`);
    
    // Print all fields with their values
    for (const key of allKeys) {
      const val = attrs[key];
      const displayVal = val === null ? 'null' 
        : typeof val === 'string' && val.length > 100 ? val.slice(0, 100) + '...'
        : typeof val === 'object' ? JSON.stringify(val).slice(0, 100)
        : val;
      console.log(`  ${key}: ${displayVal}`);
    }

    // Check relationships
    if (firstPage.data[0].relationships) {
      console.log('\n=== RELATIONSHIPS ===');
      console.log(JSON.stringify(firstPage.data[0].relationships, null, 2).slice(0, 500));
    }
  }

  // 2. Check total count via pagination
  console.log('\n\n=== PAGINATION INFO ===\n');
  const checkTotal = await fetchJson('/widesys/produtos?page[limit]=1');
  if (checkTotal?.links) {
    console.log('Links:', JSON.stringify(checkTotal.links));
  }
  if (checkTotal?.meta) {
    console.log('Meta:', JSON.stringify(checkTotal.meta));
  }

  // 3. Count total by checking last page
  let totalCount = 0;
  let offset = 0;
  const pageSize = 50;
  while (true) {
    const page = await fetchJson(`/widesys/produtos?page[limit]=${pageSize}&page[offset]=${offset}`);
    if (!page?.data || page.data.length === 0) break;
    totalCount += page.data.length;
    offset += pageSize;
    if (page.data.length < pageSize) break;
  }
  console.log(`\nTotal products found: ${totalCount}`);

  // 4. Check if there are related endpoints (images, owners, etc.)
  console.log('\n\n=== TESTING RELATED ENDPOINTS ===\n');
  const relatedEndpoints = [
    '/widesys/proprietarios',
    '/widesys/owners',
    '/widesys/categorias',
    '/widesys/categories',
    '/widesys/empreendimentos',
    '/widesys/fotos',
    '/widesys/images',
    '/widesys/caracteristicas',
    '/widesys/features',
    '/widesys/condominio',
    '/widesys/condominios',
    '/widesys/despesas',
    '/widesys/bairros',
    '/widesys/localizacoes',
  ];

  for (const ep of relatedEndpoints) {
    try {
      const res = await fetch(`${BASE_API}${ep}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const count = data.data?.length || 0;
        const keys = count > 0 ? Object.keys(data.data[0].attributes || {}).slice(0, 8) : [];
        console.log(`  ✅ [${res.status}] ${ep} → ${count} items, keys: ${keys.join(', ')}`);
      } else {
        console.log(`  ❌ [${res.status}] ${ep}`);
      }
    } catch {
      console.log(`  ❌ [ERR] ${ep}`);
    }
  }

  // 5. Get a product with images/fotos info
  console.log('\n\n=== PRODUCT WITH IMAGE DATA ===\n');
  const withId = firstPage?.data?.[0]?.id;
  if (withId) {
    const single = await fetchJson(`/widesys/produtos/${withId}`);
    if (single?.data) {
      const attrs = single.data.attributes;
      // Look for image-related fields
      for (const key of Object.keys(attrs)) {
        if (key.toLowerCase().includes('foto') || key.toLowerCase().includes('imag') || key.toLowerCase().includes('galeri') || key.toLowerCase().includes('media') || key.toLowerCase().includes('thumb')) {
          console.log(`  ${key}:`, JSON.stringify(attrs[key]).slice(0, 200));
        }
      }
    }
  }
}

main();
