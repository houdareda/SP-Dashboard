import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws);

const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

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

const map = {};
let dupCount = 0;

rows.forEach((r, idx) => {
  const cancelStatus = r['حاله التسجيل'] ? String(r['حاله التسجيل']).trim() : '';
  if (cancelStatus === 'طلب ملغي') return;

  const agent = normalize(r['Agent Name']);
  const date = parseRowDate(r);
  if (!agent || !date) return;

  const hasExpenses = r['Total expenses'] != null || r['expenses Markt-1'] != null || r['Personal expenses'] != null;
  if (!hasExpenses) return;

  const key = `${agent}__${date}`;
  if (map[key]) {
    dupCount++;
    if (dupCount <= 5) {
      console.log(`Duplicate expense for ${key} at row ${idx + 2} (first at row ${map[key]})`);
    }
  } else {
    map[key] = idx + 2;
  }
});

console.log('Total duplicate (agent, date) expense rows:', dupCount);
