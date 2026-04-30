/**
 * Diagnóstico: Descobrir a URL base correta das imagens do Rodrigo Martinatti
 */

const BASE_API = 'https://rodrigomartinatti.com.br/api/index.php/v1';
const AUTH = 'Basic ' + btoa('rodrigomartinatti@gmail.com:Vcpff0!@#');
const HEADERS = { 
  'Accept': 'application/vnd.api+json', 
  'Authorization': AUTH
};

async function inspectImageStructure() {
  // Fetch a single product to inspect image data structure
  const res = await fetch(`${BASE_API}/widesys/produtos?page[limit]=2`, { headers: HEADERS });
  const data = await res.json();
  
  if (!data.data || data.data.length === 0) {
    console.log('No products found');
    return;
  }

  for (const product of data.data) {
    const a = product.attributes;
    console.log(`\n=== Product: ${a.nome} (ID: ${a.id}, Ref: ${a.referencia}) ===`);
    console.log(`Thumb field: ${a.produto_thumb}`);
    
    if (Array.isArray(a.imagens) && a.imagens.length > 0) {
      console.log(`Total images: ${a.imagens.length}`);
      
      // Show full structure of first 2 images
      for (let i = 0; i < Math.min(2, a.imagens.length); i++) {
        console.log(`\n  Image ${i}:`, JSON.stringify(a.imagens[i], null, 2));
      }
    } else {
      console.log('No images array');
    }
    
    // Also check other fields that might contain image paths
    console.log(`\nURL field: ${a.url}`);
    console.log(`Published: ${a.published}`);
  }
  
  // Try common image base URLs to see which one works
  const testFilename = data.data[0]?.attributes?.imagens?.[0]?.nome;
  if (testFilename) {
    console.log(`\n=== Testing URL patterns for: ${testFilename} ===`);
    
    const candidates = [
      `https://rodrigomartinatti.com.br/images/com_widesys/produtos/${testFilename}`,
      `https://rodrigomartinatti.com.br/images/widesys/produtos/${testFilename}`,
      `https://rodrigomartinatti.com.br/images/com_widesys/${testFilename}`,
      `https://rodrigomartinatti.com.br/images/widesys/${testFilename}`,
      `https://rodrigomartinatti.com.br/media/com_widesys/produtos/${testFilename}`,
      `https://rodrigomartinatti.com.br/media/widesys/produtos/${testFilename}`,
      `https://rodrigomartinatti.com.br/images/${testFilename}`,
      `https://rodrigomartinatti.com.br/media/${testFilename}`,
    ];
    
    for (const url of candidates) {
      try {
        const r = await fetch(url, { method: 'HEAD' });
        console.log(`  ${r.status} — ${url}`);
      } catch (e: any) {
        console.log(`  ERR — ${url}: ${e.message}`);
      }
    }
  }
}

inspectImageStructure().catch(console.error);
