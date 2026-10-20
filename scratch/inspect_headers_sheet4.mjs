import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

console.log('Row 0 (headers):');
rows[0].forEach((col, idx) => {
  console.log(`Col ${idx} (${String.fromCharCode(65 + (idx < 26 ? idx : 0))}): "${col}"`);
});
