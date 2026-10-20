import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws);

const r = rows[3615]; // Row 3617
console.log('Row 3617 details:', {
  agent: r['Agent Name'],
  date: r.date,
  m1: r['expenses Markt-1'],
  m2: r['expenses Markt-2'],
  m3: r['expenses Markt-3'],
  m4: r['expenses Markt-4'],
  m5: r['expenses Markt-5'],
  m6: r['expenses Markt-6'],
  pers: r['Personal expenses'],
  tot: r['Total expenses']
});
const sumWithoutM5 = Number(r['expenses Markt-1']||0) + Number(r['expenses Markt-2']||0) + Number(r['expenses Markt-3']||0) + Number(r['expenses Markt-4']||0) + Number(r['Personal expenses']||0);
console.log('Sum without M5:', sumWithoutM5);
console.log('Sum with M5:', sumWithoutM5 + Number(r['expenses Markt-5']||0));
