import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

const bothRows = rows.filter(r => (r['Total expenses'] != null) && (r['Requested amount'] != null || r['مبلغ التحويل الفعلي'] != null));
console.log('Sample rows with both:');
console.log(bothRows.slice(0, 3));
