import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws);

const agentsMap = JSON.parse(fs.readFileSync(path.resolve('scratch/agents_map.json'), 'utf-8'));
const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

let countDry = 0;
let countFinal = 0;

rows.forEach((r, idx) => {
  const cancelStatus = r['حاله التسجيل'] ? String(r['حاله التسجيل']).trim() : '';
  // In dry run:
  // if (cancelStatus === 'طلب ملغي') return; -> but cancelStatus is empty in all rows anyway!

  for (let i = 1; i <= 5; i++) {
    const nameKey = i === 1 ? 'Recipient Name' : `Recipient Name ${i}`;
    const monyKey = i === 1 ? 'Recipient Mony' : `Recipient Mony ${i}`;
    const recName = r[nameKey];
    const recMony = Number(r[monyKey]) || 0;
    if (recName && recMony > 0) {
      const recObj = agentsMap[normalize(recName)];
      if (recObj) {
        countFinal++;
      }
    }
  }
});

console.log('Total valid transfers found:', countFinal);
