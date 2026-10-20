import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

const markRows = rows.filter(r => r['Agent Name'] === 'Mark George');
const thomasRows = rows.filter(r => r['Agent Name'] === 'Thomas Throat');

console.log('Mark George rows count:', markRows.length);
console.log('Thomas Throat rows count:', thomasRows.length);
console.log('Mark George sample:', markRows[0]);
console.log('Thomas Throat sample:', thomasRows[0]);
