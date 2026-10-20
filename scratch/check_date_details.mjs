import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath, { cellDates: true });
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

console.log('Inspecting 2015 rows:');
const rows2015 = rows.filter(r => r.date instanceof Date && r.date.getFullYear() === 2015);
rows2015.forEach((r, idx) => {
  console.log(`[${idx}] Agent: ${r['Agent Name']}, manual: ${r['تاريخ يدوي']}, note: ${r['ملاحظة']}, date: ${r.date?.toISOString()}`);
});

console.log('\nAre there any rows where date is NOT a Date?');
const invalidDates = rows.filter(r => !(r.date instanceof Date));
console.log('Invalid date rows count:', invalidDates.length);
if (invalidDates.length > 0) {
  console.log('Invalid date row sample:', invalidDates);
}
