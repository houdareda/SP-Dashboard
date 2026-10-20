import xlsx from 'xlsx';
import path from 'path';

const file = path.resolve('Untitled spreadsheet (1).xlsx');
const wb = xlsx.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws);

console.log('Row 5468:', rows[5468]);
