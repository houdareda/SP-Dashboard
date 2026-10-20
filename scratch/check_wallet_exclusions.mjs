import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (1).xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

function cleanPhone(raw) {
  if (!raw) return null;
  let p = String(raw).trim();
  if (p.includes('e+') || p.includes('E+')) {
    p = String(Number(p));
  }
  if (p.startsWith('20')) p = '0' + p.slice(2);
  else if (!p.startsWith('0')) p = '0' + p;
  return p;
}

const allCleaned = new Set();
const excluded = [];

rows.forEach(r => {
  const w = r['Number Wallet'];
  if (w) {
    const p = cleanPhone(w);
    if (p) {
      allCleaned.add(p);
      if (!(p.length >= 10 && p.length <= 12)) {
        excluded.push({ raw: w, cleaned: p, agent: r['Agent Name'] });
      }
    }
  }
});

console.log('All cleaned set size:', allCleaned.size);
console.log('Excluded from phone length check:', excluded);
