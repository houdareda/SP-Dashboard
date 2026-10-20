import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (1).xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

console.log('--- Checking rows with notes or special status ---');
const notes = [];
rows.forEach((r, idx) => {
  if (r['ملاحظة']) {
    notes.push({ rowIdx: idx + 2, agent: r['Agent Name'], note: r['ملاحظة'], req: r['Requested amount'], act: r['مبلغ التحويل الفعلي'], status: r['حاله طلب التحويل'] });
  }
});

console.log('Total rows with notes:', notes.length);
notes.forEach(n => console.log(n));
