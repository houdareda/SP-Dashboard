import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws);

let blankRecWithMoney = 0;

rows.forEach((r, idx) => {
  const cancelStatus = r['حاله التسجيل'] ? String(r['حاله التسجيل']).trim() : '';
  if (cancelStatus === 'طلب ملغي') return;

  for (let i = 1; i <= 5; i++) {
    const nameKey = i === 1 ? 'Recipient Name' : `Recipient Name ${i}`;
    const monyKey = i === 1 ? 'Recipient Mony' : `Recipient Mony ${i}`;
    const recName = r[nameKey] ? String(r[nameKey]).trim() : '';
    const recMony = Number(r[monyKey]) || 0;
    if (!recName && recMony > 0) {
      blankRecWithMoney++;
      console.log(`Row ${idx + 2}: ${r['Agent Name']} has blank recipient for ${recMony} EGP`);
    }
  }
});

console.log('Total blank recipients with money > 0:', blankRecWithMoney);
