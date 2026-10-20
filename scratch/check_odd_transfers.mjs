import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (1).xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

const transEndingWith2or4 = [];

rows.forEach((r, idx) => {
  for (let i = 1; i <= 5; i++) {
    const monyKey = i === 1 ? 'Recipient Mony' : `Recipient Mony ${i}`;
    const nameKey = i === 1 ? 'Recipient Name' : `Recipient Name ${i}`;
    const val = r[monyKey];
    if (val != null) {
      const num = Number(val);
      if (num % 5 !== 0 && num % 10 !== 0) {
        transEndingWith2or4.push({
          rowIdx: idx + 2,
          agent: r['Agent Name'],
          recipient: r[nameKey],
          amount: num,
          date: r.date
        });
      }
    }
  }
});

console.log('Transfers not ending in 0 or 5 (e.g. ending in 1, 2, 3, 4, 6, 7, 8):', transEndingWith2or4.length);
console.log('Sample weird transfer amounts:');
transEndingWith2or4.slice(0, 25).forEach(t => console.log(t));
