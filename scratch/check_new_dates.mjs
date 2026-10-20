import xlsx from 'xlsx';
import path from 'path';

const file = path.resolve('Untitled spreadsheet (1).xlsx');
const wb = xlsx.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws);

let unparsed = 0;
const yearCounts = {};

function parseRowDate(r) {
  if (r.date === 42095 && r['تاريخ يدوي'] === '22/5') return '2026-05-22';
  if (typeof r.date === 'number') {
    const p = xlsx.SSF.parse_date_code(r.date);
    if (p && p.y && p.m && p.d) {
      return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
    }
  }
  if (typeof r.date === 'string') {
    // Check if it's YYYY-MM-DD or DD/MM/YYYY
    const d = new Date(r.date);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  return null;
}

rows.forEach((r, idx) => {
  const d = parseRowDate(r);
  if (!d) {
    unparsed++;
    console.log(`Unparsed row ${idx}:`, r.date, r['تاريخ يدوي']);
  } else {
    const yr = d.slice(0, 4);
    yearCounts[yr] = (yearCounts[yr] || 0) + 1;
  }
});

console.log('Unparsed count:', unparsed);
console.log('Year distribution:', yearCounts);
