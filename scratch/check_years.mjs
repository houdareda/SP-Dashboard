import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath, { cellDates: true });
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

const yearMap = {};
rows.forEach((r, idx) => {
  if (r.date instanceof Date) {
    const y = r.date.getFullYear();
    yearMap[y] = (yearMap[y] || 0) + 1;
  }
});
console.log('Date year distribution:', yearMap);

const rows2015 = rows.filter(r => r.date instanceof Date && r.date.getFullYear() === 2015);
console.log('Total 2015 rows:', rows2015.length);
console.log('First 3 2015 rows:', rows2015.slice(0, 3));
