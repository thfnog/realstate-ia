// Quick test: check if pagination returns different results
async function test() {
  const pages = [0, 20, 40, 60];
  
  for (const start of pages) {
    const url = `https://rodrigomartinatti.com.br/imoveis-venda?limitstart=${start}`;
    const res = await fetch(url);
    const html = await res.text();
    
    const linkRegex = /href="(\/imoveis-venda\/\d+-[^"#?]+)"/g;
    const urls = new Set<string>();
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      urls.add(match[1]);
    }
    
    console.log(`limitstart=${start}: ${urls.size} links`);
    if (urls.size > 0) {
      const first3 = [...urls].slice(0, 3).map(u => u.split('/').pop()?.slice(0, 50));
      console.log('  ', first3);
    }
  }

  // Also try ?start=
  for (const start of [0, 12, 24, 36]) {
    const url = `https://rodrigomartinatti.com.br/imoveis-venda?start=${start}`;
    const res = await fetch(url);
    const html = await res.text();
    
    const linkRegex = /href="(\/imoveis-venda\/\d+-[^"#?]+)"/g;
    const urls = new Set<string>();
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      urls.add(match[1]);
    }
    
    console.log(`start=${start}: ${urls.size} links`);
    if (urls.size > 0) {
      const first3 = [...urls].slice(0, 3).map(u => u.split('/').pop()?.slice(0, 50));
      console.log('  ', first3);
    }
  }

  // Check if there's a "load more" or AJAX endpoint
  const mainHtml = await (await fetch('https://rodrigomartinatti.com.br/imoveis-venda')).text();
  
  // Look for pagination links
  const paginationMatch = mainHtml.match(/class="[^"]*pagination[^"]*"[\s\S]*?<\/(?:ul|nav|div)>/i);
  if (paginationMatch) {
    console.log('\n=== Pagination HTML ===');
    console.log(paginationMatch[0].slice(0, 500));
  }

  // Look for total count
  const totalMatch = mainHtml.match(/(\d+)\s*(?:imóve[il]s?|resultado|encontrado)/i);
  if (totalMatch) {
    console.log('\nTotal found:', totalMatch[0]);
  }

  // Look for any AJAX/API endpoints
  const ajaxMatch = mainHtml.match(/(?:ajax|api|json|loadmore|infinite)[^"'\s]*/gi);
  if (ajaxMatch) {
    console.log('\nAJAX patterns:', [...new Set(ajaxMatch)]);
  }
}

test();
