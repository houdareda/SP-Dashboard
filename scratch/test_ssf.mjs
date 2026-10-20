import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

for (let i = 1000; i < 1010; i++) {
  const r = rows[i];
  console.log(`Row ${i}: raw date =`, r.date, `| manual =`, r['تاريخ يدوي']);
  const parsed = xlsx.SSF.parse_date_code(r.date);
  console.log('  SSF parsed:', parsed);
}
