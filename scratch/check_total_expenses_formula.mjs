import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws);

let diffs = 0;

rows.forEach((r, idx) => {
  const cancelStatus = r['حاله التسجيل'] ? String(r['حاله التسجيل']).trim() : '';
  if (cancelStatus === 'طلب ملغي') return;

  const excelTotal = Number(r['Total expenses']) || 0;
  const m1 = Number(r['expenses Markt-1']) || 0;
  const m2 = Number(r['expenses Markt-2']) || 0;
  const m3 = Number(r['expenses Markt-3']) || 0;
  const m4 = Number(r['expenses Markt-4']) || 0;
  const m5 = Number(r['expenses Markt-5']) || 0;
  const m6 = Number(r['expenses Markt-6']) || 0;
  const pers = Number(r['Personal expenses']) || 0;

  let trans = 0;
  for (let i = 1; i <= 5; i++) {
    const monyKey = i === 1 ? 'Recipient Mony' : `Recipient Mony ${i}`;
    trans += Number(r[monyKey]) || 0;
  }

  const computedTotal = m1 + m2 + m3 + m4 + m5 + m6 + pers + trans;
  if (Math.abs(excelTotal - computedTotal) > 0.01 && (excelTotal > 0 || computedTotal > 0)) {
    diffs++;
    if (diffs <= 5) {
      console.log(`Row ${idx + 2}: Excel Total=${excelTotal}, Computed=${computedTotal} (diff=${excelTotal - computedTotal})`);
    }
  }
});

console.log('Total diffs between Excel Total expenses and sum(m1..m6 + pers + trans):', diffs);
