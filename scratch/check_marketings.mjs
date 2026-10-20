import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

let countM1 = 0, sumM1 = 0;
let countM2 = 0, sumM2 = 0;
let countM3 = 0, sumM3 = 0;
let countM4 = 0, sumM4 = 0;
let countM5 = 0, sumM5 = 0;
let countM6 = 0, sumM6 = 0;
let countPersonal = 0, sumPersonal = 0;
let countTotalExp = 0, sumTotalExp = 0;

rows.forEach(r => {
  if (r['expenses Markt-1'] != null && Number(r['expenses Markt-1']) > 0) {
    countM1++; sumM1 += Number(r['expenses Markt-1']);
  }
  if (r['expenses Markt-2'] != null && Number(r['expenses Markt-2']) > 0) {
    countM2++; sumM2 += Number(r['expenses Markt-2']);
  }
  if (r['expenses Markt-3'] != null && Number(r['expenses Markt-3']) > 0) {
    countM3++; sumM3 += Number(r['expenses Markt-3']);
  }
  if (r['expenses Markt-4'] != null && Number(r['expenses Markt-4']) > 0) {
    countM4++; sumM4 += Number(r['expenses Markt-4']);
  }
  if (r['expenses Markt-5'] != null && Number(r['expenses Markt-5']) > 0) {
    countM5++; sumM5 += Number(r['expenses Markt-5']);
  }
  if (r['expenses Markt-6'] != null && Number(r['expenses Markt-6']) > 0) {
    countM6++; sumM6 += Number(r['expenses Markt-6']);
  }
  if (r['Personal expenses'] != null && Number(r['Personal expenses']) > 0) {
    countPersonal++; sumPersonal += Number(r['Personal expenses']);
  }
  if (r['Total expenses'] != null && Number(r['Total expenses']) > 0) {
    countTotalExp++; sumTotalExp += Number(r['Total expenses']);
  }
});

console.log('Marketing 1:', { count: countM1, sum: sumM1 });
console.log('Marketing 2:', { count: countM2, sum: sumM2 });
console.log('Marketing 3:', { count: countM3, sum: sumM3 });
console.log('Marketing 4:', { count: countM4, sum: sumM4 });
console.log('Marketing 5:', { count: countM5, sum: sumM5 });
console.log('Marketing 6:', { count: countM6, sum: sumM6 });
console.log('Personal:', { count: countPersonal, sum: sumPersonal });
console.log('Total Expenses:', { count: countTotalExp, sum: sumTotalExp });
