import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws);

console.log('Searching for Bishoy Yousry rows with 20000 transfer and Andrew Nasser with 60000 transfer:');

rows.forEach((r, idx) => {
  const ag = r['Agent Name'];
  if (ag === 'Bishoy Yousry') {
    for (let i = 1; i <= 5; i++) {
      const k = i === 1 ? 'Recipient Mony' : `Recipient Mony ${i}`;
      if (Number(r[k]) === 20000) {
        console.log(`Bishoy Yousry row ${idx+2}:`, r);
      }
    }
  }
  if (ag === 'Andrew Nasser') {
    for (let i = 1; i <= 5; i++) {
      const k = i === 1 ? 'Recipient Mony' : `Recipient Mony ${i}`;
      if (Number(r[k]) === 60000) {
        console.log(`Andrew Nasser row ${idx+2}:`, r);
      }
    }
  }
});
