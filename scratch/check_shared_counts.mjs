import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

function cleanPhone(raw) {
  let p = String(raw).trim();
  if (p.startsWith('20')) p = '0' + p.slice(2);
  else if (!p.startsWith('0')) p = '0' + p;
  return p;
}

let countAbanob = 0;
let countBishoy = 0;

rows.forEach(r => {
  const p = cleanPhone(r['Number Wallet'] || '');
  if (p === '01200870875') {
    if (r['Agent Name'] === 'Abanob Essa') countAbanob++;
    if (r['Agent Name'] === 'bishoy farid') countBishoy++;
  }
});

console.log('01200870875 count: Abanob Essa =', countAbanob, ', bishoy farid =', countBishoy);
