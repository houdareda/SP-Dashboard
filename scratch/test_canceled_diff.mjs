import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rowsArr = xlsx.utils.sheet_to_json(ws, { header: 1 });
const rowsObj = xlsx.utils.sheet_to_json(ws);

let arrCanceled = 0;
let objCanceled = 0;

for (let i = 1; i < rowsArr.length; i++) {
  const r = rowsArr[i];
  if (r && r[21] && String(r[21]).trim() === 'طلب ملغي') {
    arrCanceled++;
  }
}

rowsObj.forEach(r => {
  if (r['حاله التسجيل'] && String(r['حاله التسجيل']).trim() === 'طلب ملغي') {
    objCanceled++;
  }
});

console.log('arrCanceled (col 21):', arrCanceled);
console.log('objCanceled (key "حاله التسجيل"):', objCanceled);

// Let's check unique values of r[21] and r['حاله التسجيل']
const setArr = new Set();
for (let i = 1; i < rowsArr.length; i++) {
  if (rowsArr[i] && rowsArr[i][21]) setArr.add(String(rowsArr[i][21]).trim());
}
console.log('Unique values of col 21:', Array.from(setArr));
