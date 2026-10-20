import xlsx from 'xlsx';
import path from 'path';

const file = path.resolve('Untitled spreadsheet (1).xlsx');
const wb = xlsx.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws);

function parseRowDate(r) {
  if (r.date === 42095 && r['تاريخ يدوي'] === '22/5') return '2026-05-22';
  if (typeof r.date === 'number') {
    const p = xlsx.SSF.parse_date_code(r.date);
    if (p && p.y && p.m && p.d) {
      return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
    }
  }
  return null;
}

let countWithAgent = 0;
let unparsedWithAgent = 0;

rows.forEach((r, idx) => {
  if (r['Agent Name']) {
    countWithAgent++;
    const d = parseRowDate(r);
    if (!d) {
      unparsedWithAgent++;
      console.log(`Agent ${r['Agent Name']} at row ${idx} has unparsed date:`, r.date, r['تاريخ يدوي']);
    }
  }
});

console.log('Total rows with agent name:', countWithAgent);
console.log('Unparsed rows with agent name:', unparsedWithAgent);
