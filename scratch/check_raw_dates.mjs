import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath, { cellDates: true });
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

console.log('Sample rows with cellDates: true:');
for (let i = 0; i < 10; i++) {
  console.log(`Row ${i}: date =`, rows[i].date, `| manualDate =`, rows[i]['تاريخ يدوي'], `| agent =`, rows[i]['Agent Name']);
}

for (let i = 1000; i < 1010; i++) {
  console.log(`Row ${i}: date =`, rows[i].date, `| manualDate =`, rows[i]['تاريخ يدوي'], `| agent =`, rows[i]['Agent Name']);
}

for (let i = rows.length - 10; i < rows.length; i++) {
  console.log(`Row ${i}: date =`, rows[i].date, `| manualDate =`, rows[i]['تاريخ يدوي'], `| agent =`, rows[i]['Agent Name']);
}
