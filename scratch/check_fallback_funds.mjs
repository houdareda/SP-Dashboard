import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (1).xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

const rowsWithReqButNoActual = [];
let sumFallback = 0;

rows.forEach((r, idx) => {
  const req = r['Requested amount'];
  const act = r['مبلغ التحويل الفعلي'];
  const status = r['حاله طلب التحويل'];

  if (act == null || act === '') {
    if (req != null && req !== '' && Number(req) > 0) {
      rowsWithReqButNoActual.push({
        rowIdx: idx + 2,
        agent: r['Agent Name'],
        date: r.date,
        req,
        act,
        status
      });
      sumFallback += Number(req);
    }
  }
});

console.log('Rows with Requested Amount but NO Actual Amount:', rowsWithReqButNoActual.length);
console.log('Sum of fallback amounts:', sumFallback);
console.log('Sample rows:', rowsWithReqButNoActual);
