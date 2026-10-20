import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

const rowsWithHOrI = [];
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r) continue;
  if ((r[7] != null && r[7] !== '' && Number(r[7]) > 0) || (r[8] != null && r[8] !== '' && Number(r[8]) > 0)) {
    rowsWithHOrI.push({
      rowIdx: i + 1,
      date: r[0],
      agent: r[1],
      totalExp: r[2],
      m1: r[3],
      m2: r[4],
      m3: r[5],
      m4: r[6],
      m5: r[7],
      m6: r[8],
      pers: r[9],
      note: r[27]
    });
  }
}

console.log('Rows with M5 or M6 count:', rowsWithHOrI.length);
console.log('Sample rows with M5/M6:', rowsWithHOrI.slice(0, 10));
