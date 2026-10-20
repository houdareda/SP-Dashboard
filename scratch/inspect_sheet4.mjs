import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
console.log('Sheet Names:', wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\nSheet "${sheetName}": ${data.length} rows`);
  if (data.length > 0) {
    console.log('Row 0 (headers):', data[0]);
    if (data.length > 1) console.log('Row 1:', data[1]);
    if (data.length > 2) console.log('Row 2:', data[2]);
  }
});
