import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

const statusMap = {};
rows.forEach(r => {
  const s = r['حاله طلب التحويل'];
  if (r['Requested amount'] != null || r['مبلغ التحويل الفعلي'] != null || s != null) {
    const key = String(s);
    statusMap[key] = (statusMap[key] || 0) + 1;
  }
});

console.log('Fund request status breakdown:', statusMap);
