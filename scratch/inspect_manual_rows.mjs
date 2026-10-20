import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (1).xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

console.log('--- Printing rows 2 to 27 (the "محطوط يدوي" rows) ---');
for (let i = 0; i < 26; i++) {
  console.log(`Row ${i+2}:`, rows[i]);
}
