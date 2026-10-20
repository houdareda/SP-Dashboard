import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

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

const agentDateMap = {};
let duplicateExpensesCount = 0;

rows.forEach((r, idx) => {
  const agent = r['Agent Name'];
  if (!agent) return;
  const date = parseRowDate(r);
  const hasExp = r['Total expenses'] != null || r['expenses Markt-1'] != null;

  if (hasExp) {
    const key = `${agent}_${date}`;
    if (agentDateMap[key]) {
      duplicateExpensesCount++;
    } else {
      agentDateMap[key] = [];
    }
    agentDateMap[key].push(idx);
  }
});

console.log('Unique Agent+Date combinations with expenses:', Object.keys(agentDateMap).length);
console.log('Duplicate expense entries on same date for same agent:', duplicateExpensesCount);

// Sample duplicates
for (const [key, rowIndices] of Object.entries(agentDateMap)) {
  if (rowIndices.length > 1) {
    console.log(`\nSample Duplicate key: ${key} (${rowIndices.length} rows)`);
    rowIndices.forEach(idx => {
      console.log('  Row', idx, ':', rows[idx]);
    });
    break;
  }
}
