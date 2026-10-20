import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

function parseRowDate(r) {
  // If date is serial 42095 and manual date is 22/5 -> 2026-05-22
  if (r.date === 42095 && r['تاريخ يدوي'] === '22/5') {
    return '2026-05-22';
  }
  if (typeof r.date === 'number') {
    const p = xlsx.SSF.parse_date_code(r.date);
    if (p && p.y && p.m && p.d) {
      return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
    }
  }
  return null;
}

let validCount = 0;
let invalidCount = 0;
const dateDistribution = {};

rows.forEach((r, idx) => {
  if (!r['Agent Name']) return; // skip empty row
  const d = parseRowDate(r);
  if (d) {
    validCount++;
    const ym = d.slice(0, 7);
    dateDistribution[ym] = (dateDistribution[ym] || 0) + 1;
  } else {
    invalidCount++;
    console.log(`Invalid date row ${idx}:`, r);
  }
});

console.log('Valid dates count:', validCount);
console.log('Invalid dates count:', invalidCount);
console.log('Date distribution by month:', dateDistribution);
