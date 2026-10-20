import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (1).xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

// Let's search for 98000 or anything near 98,000
// 1. Any individual requests or expenses near 98,000?
console.log('--- Searching for rows with amounts near 98,000 ---');
rows.forEach((r, idx) => {
  ['Total expenses', 'Requested amount', 'مبلغ التحويل الفعلي'].forEach(col => {
    const v = Number(r[col]);
    if (v >= 95000 && v <= 105000) {
      console.log(`Row ${idx+2} | Col: ${col} | Val: ${v} | Agent: ${r['Agent Name']} | Date: ${r.date}`);
    }
  });
});

// 2. Sum of pending requests?
let pendingSum = 0;
let rejectedSumColW = 0;
let rejectedSumColX = 0;
rows.forEach(r => {
  if (r['حاله طلب التحويل'] === 'مرفوض') {
    rejectedSumColW += Number(r['Requested amount']) || 0;
    rejectedSumColX += Number(r['مبلغ التحويل الفعلي']) || 0;
  }
  if (!r['حاله طلب التحويل'] && r['Requested amount']) {
    pendingSum += Number(r['Requested amount']) || 0;
  }
});
console.log('\nPending requests sum (empty status with requested amount):', pendingSum);
console.log('Rejected sum Col W:', rejectedSumColW);

// 3. Difference between Col W and Col X on approved transfers
let approvedDiffWX = 0;
rows.forEach(r => {
  if (r['حاله طلب التحويل'] === 'تم التحويل بمبلغ مختلف') {
    const req = Number(r['Requested amount']) || 0;
    const act = Number(r['مبلغ التحويل الفعلي']) || 0;
    approvedDiffWX += (req - act);
  }
});
console.log('Total difference on "تم التحويل بمبلغ مختلف" (Req - Act):', approvedDiffWX);

// 4. Incomplete forms / empty rows / without formId?
const formIdCounts = {};
rows.forEach(r => {
  const f = r['formId'] ? 'has_form' : 'no_form';
  formIdCounts[f] = (formIdCounts[f] || 0) + 1;
});
console.log('FormId counts:', formIdCounts);
