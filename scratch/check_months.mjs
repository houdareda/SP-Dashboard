import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath, { cellDates: true });
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

const monthMap = {};
rows.forEach((r, idx) => {
  if (r.date instanceof Date) {
    const ym = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`;
    monthMap[ym] = (monthMap[ym] || 0) + 1;
  }
});
console.log('Month distribution:', monthMap);
