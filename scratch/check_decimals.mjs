import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (1).xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

const decimalRows = [];
rows.forEach((r, idx) => {
  ['Total expenses', 'expenses Markt-1', 'expenses Markt-2', 'expenses Markt-3', 'Personal expenses', 'Recipient Mony', 'Requested amount', 'مبلغ التحويل الفعلي'].forEach(col => {
    if (r[col] != null) {
      const val = Number(r[col]);
      if (!isNaN(val) && val % 1 !== 0) {
        decimalRows.push({ rowIdx: idx + 2, col, val, agent: r['Agent Name'] });
      }
    }
  });
});

console.log('Decimal values count in sheet:', decimalRows.length);
if (decimalRows.length > 0) {
  console.log('Sample decimals:', decimalRows.slice(0, 10));
}
