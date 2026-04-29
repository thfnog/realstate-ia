// Test Joomla REST API endpoints to find Widesys product data
const BASE_API = 'https://rodrigomartinatti.com.br/api/index.php/v1';
const headers = { 
  'Accept': 'application/vnd.api+json', 
  'Authorization': 'Basic ' + btoa('rodrigomartinatti@gmail.com:Vcpff0!@#')
};

async function testEndpoint(path: string): Promise<void> {
  try {
    const res = await fetch(`${BASE_API}${path}`, { headers });
    const text = await res.text();
    console.log(`[${res.status}] ${path}`);
    if (res.status === 200) {
      try {
        const json = JSON.parse(text);
        if (json.data) {
          console.log(`  → ${Array.isArray(json.data) ? json.data.length + ' items' : 'single item'}`);
          if (Array.isArray(json.data) && json.data.length > 0) {
            console.log(`  → First item keys:`, Object.keys(json.data[0].attributes || json.data[0]).slice(0, 15));
          }
        }
        if (json.links) {
          console.log(`  → Links:`, Object.keys(json.links));
        }
      } catch {
        console.log(`  → Response (text, first 200 chars):`, text.slice(0, 200));
      }
    }
  } catch (err: any) {
    console.log(`[ERR] ${path}: ${err.message}`);
  }
}

async function main() {
  console.log('=== Testing Joomla REST API Endpoints ===\n');
  
  // Standard Joomla 4/5 API endpoints
  const endpoints = [
    '/content/articles',
    '/content/categories',
    '/menus/site',
    '/users',
    '/extensions',
    '/components',
    '/plugins',
    '/modules/site',
    // Widesys custom endpoints (guesses)
    '/widesys/produtos',
    '/widesys/products',
    '/widesys/imoveis',
    '/widesys/properties',
    '/com_widesys/produtos',
    '/com_widesys/products',
  ];

  for (const ep of endpoints) {
    await testEndpoint(ep);
  }

  // Also try to find content in Joomla articles that may be property-related
  console.log('\n\n=== Checking Content Articles for Widesys Data ===\n');
  const articlesRes = await fetch(`${BASE_API}/content/articles?page[limit]=5`, { headers });
  if (articlesRes.ok) {
    const data = await articlesRes.json();
    if (data.data?.length > 0) {
      for (const article of data.data.slice(0, 3)) {
        console.log(`  Article: ${article.attributes?.title} (id: ${article.id})`);
      }
    }
  }

  // Try fetching the content categories to understand structure
  console.log('\n=== Content Categories ===\n');
  const catRes = await fetch(`${BASE_API}/content/categories`, { headers });
  if (catRes.ok) {
    const catData = await catRes.json();
    if (catData.data) {
      for (const cat of catData.data) {
        console.log(`  Category: ${cat.attributes?.title} (id: ${cat.id})`);
      }
    }
  }
}

main();
