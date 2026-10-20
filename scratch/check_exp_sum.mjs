import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

console.log('Keys of first row with expenses:');
const r = rows.find(x => x['Total expenses'] != null || x['expenses Markt-1'] != null);
console.log(Object.keys(r));
console.log('Sample row with expenses:');
console.log(r);

let sumCol = 0;
let sumComponents = 0;
rows.forEach(x => {
  if (x['Total expenses'] != null) sumCol += Number(x['Total expenses']) || 0;
  const m1 = Number(x['expenses Markt-1']) || 0;
  const m2 = Number(x['expenses Markt-2']) || 0;
  const m3 = Number(x['expenses Markt-3']) || 0;
  const m4 = Number(x['expenses Markt-4']) || 0;
  const m5 = Number(x['expenses Markt-5']) || 0;
  const m6 = Number(x['expenses Markt-6']) || 0;
  const p = Number(x['Personal expenses']) || 0;
  sumComponents += (m1 + m2 + m3 + m4 + m5 + m6 + p);
});

console.log('Sum of Total expenses column:', sumCol);
console.log('Sum of m1..m6 + personal:', sumComponents);
