import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

console.log('Total rows:', rows.length);

// Check date column formats
const dateTypes = {};
const sampleDates = [];

rows.forEach(r => {
  const d = r['date'];
  const t = typeof d;
  dateTypes[t] = (dateTypes[t] || 0) + 1;
  if (sampleDates.length < 10) sampleDates.push({ date: d, manualDate: r['تاريخ يدوي'] });
});

console.log('Date types:', dateTypes);
console.log('Sample dates:', sampleDates);

// Check excel serial to JS date:
// In Excel, 46113:
// Excel day 1 is 1899-12-30 or 1900-01-01.
// Let's test xlsx.SSF.parse_date_code
const testSerials = [42095, 46113, 45383];
testSerials.forEach(s => {
  const parsed = xlsx.SSF.parse_date_code(s);
  console.log(`Serial ${s} ->`, parsed);
});
