import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);

console.log('Sheet Names:', workbook.SheetNames);

for (const name of workbook.SheetNames) {
  const sheet = workbook.Sheets[name];
  const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n=== Sheet: ${name} ===`);
  console.log(`Row count: ${json.length}`);
  console.log('First 5 rows:');
  console.log(json.slice(0, 5));
}
