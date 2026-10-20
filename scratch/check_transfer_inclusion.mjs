import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

let totalEqualsWithTransfers = 0;
let totalEqualsWithoutTransfers = 0;
let otherCount = 0;

const sampleWithTransfers = [];

rows.forEach(r => {
  let hasTransfer = false;
  let transferSum = 0;
  for (let i = 1; i <= 5; i++) {
    const k = i === 1 ? 'Recipient Mony' : `Recipient Mony ${i}`;
    if (r[k] != null && Number(r[k]) > 0) {
      hasTransfer = true;
      transferSum += Number(r[k]);
    }
  }

  if (hasTransfer) {
    const total = Number(r['Total expenses']) || 0;
    const m1 = Number(r['expenses Markt-1']) || 0;
    const m2 = Number(r['expenses Markt-2']) || 0;
    const m3 = Number(r['expenses Markt-3']) || 0;
    const m4 = Number(r['expenses Markt-4']) || 0;
    const m5 = Number(r['expenses Markt-5']) || 0;
    const m6 = Number(r['expenses Markt-6']) || 0;
    const p = Number(r['Personal expenses']) || 0;

    const baseSum = m1 + m2 + m3 + m4 + m5 + m6 + p;
    const fullSum = baseSum + transferSum;

    if (total === fullSum) {
      totalEqualsWithTransfers++;
    } else if (total === baseSum) {
      totalEqualsWithoutTransfers++;
    } else {
      otherCount++;
      if (sampleWithTransfers.length < 5) {
        sampleWithTransfers.push({ total, baseSum, transferSum, diff: total - fullSum });
      }
    }
  }
});

console.log('Rows with transfers where Total expenses == Markt + Personal + Transfer:', totalEqualsWithTransfers);
console.log('Rows with transfers where Total expenses == Markt + Personal (WITHOUT transfer):', totalEqualsWithoutTransfers);
console.log('Other differences:', otherCount);
console.log('Samples of other:', sampleWithTransfers);
