import * as xlsx from 'xlsx';

const filePath = 'scratch/imoveis_rodrigo_martinatti_COMPLETO.xlsx';
const workbook = xlsx.readFile(filePath);

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n--- Sheet: ${sheetName} ---`);
  console.log(data[0]); // Print headers
});
