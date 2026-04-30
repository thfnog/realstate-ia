const XLSX = require('xlsx');

async function checkStatus() {
  const workbook = XLSX.readFile('scratch/imoveis_rodrigo_martinatti_COMPLETO.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: any[] = XLSX.utils.sheet_to_json(sheet);
  
  console.log('Total rows:', data.length);
  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    
    // Look for status related columns
    const statusCols = Object.keys(data[0]).filter(c => 
      c.toLowerCase().includes('status') || 
      c.toLowerCase().includes('ativo') || 
      c.toLowerCase().includes('exibir') ||
      c.toLowerCase().includes('site') ||
      c.toLowerCase().includes('publicado')
    );
    console.log('Potential status columns:', statusCols);

    const samples = data.slice(0, 20).map(r => {
      const info: any = { ref: r.Referencia };
      statusCols.forEach(c => info[c] = r[c]);
      return info;
    });
    console.log('Samples:', JSON.stringify(samples, null, 2));

    const counts: any = {};
    statusCols.forEach(c => {
      counts[c] = {};
      data.forEach(r => {
        const val = String(r[c]);
        counts[c][val] = (counts[c][val] || 0) + 1;
      });
    });
    console.log('Value counts:', JSON.stringify(counts, null, 2));
  }
}

checkStatus();
