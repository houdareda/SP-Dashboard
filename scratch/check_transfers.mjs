import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

const recipientNames = new Set();
let transferRowsCount = 0;
let totalTransfersAmount = 0;

rows.forEach(r => {
  for (let i = 1; i <= 5; i++) {
    const nameKey = i === 1 ? 'Recipient Name' : `Recipient Name ${i}`;
    const monyKey = i === 1 ? 'Recipient Mony' : `Recipient Mony ${i}`;
    if (r[nameKey] || r[monyKey]) {
      recipientNames.add(String(r[nameKey]).trim());
      transferRowsCount++;
      totalTransfersAmount += Number(r[monyKey]) || 0;
    }
  }
});

console.log('Unique Recipient Names:', Array.from(recipientNames));
console.log('Total individual transfers count:', transferRowsCount);
console.log('Total transfers amount:', totalTransfersAmount);
