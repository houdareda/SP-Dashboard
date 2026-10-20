import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws);

let emptyFunds = 0;
let approvedFunds = 0;
let rejectedFunds = 0;
let otherFunds = 0;

rows.forEach((r, idx) => {
  const cancelStatus = r['حاله التسجيل'] ? String(r['حاله التسجيل']).trim() : '';
  if (cancelStatus === 'طلب ملغي') return;

  const hasFunds = r['Requested amount'] != null || r['مبلغ التحويل الفعلي'] != null || r['حاله طلب التحويل'] != null;
  if (!hasFunds) return;

  const status = r['حاله طلب التحويل'] ? String(r['حاله طلب التحويل']).trim() : '';
  const req = Number(r['Requested amount']) || 0;
  const act = Number(r['مبلغ التحويل الفعلي']) || 0;

  if (status === 'تم التحويل' || status === 'تم التحويل بمبلغ مختلف') {
    approvedFunds++;
  } else if (status === 'مرفوض') {
    rejectedFunds++;
  } else {
    otherFunds++;
    console.log(`Row ${idx + 2}: Status="${status}", Req=${req}, Act=${act}`);
  }
});

console.log({ approvedFunds, rejectedFunds, otherFunds });
