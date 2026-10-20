import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath, { cellDates: true });
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

console.log('Testing timezone offset to Egypt (UTC+3):');
for (let i = 1000; i < 1010; i++) {
  const r = rows[i];
  if (r.date instanceof Date) {
    // Add 3 hours (180 mins) to UTC to get local Egypt date
    const egyptTime = new Date(r.date.getTime() + 3 * 3600 * 1000);
    const y = egyptTime.getUTCFullYear();
    const m = String(egyptTime.getUTCMonth() + 1).padStart(2, '0');
    const d = String(egyptTime.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    console.log(`Row ${i}: UTC = ${r.date.toISOString()} -> Egypt = ${dateStr} | manual = ${r['تاريخ يدوي']}`);
  }
}
