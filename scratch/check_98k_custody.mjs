import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (1).xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

// Check all values in 'حاله طلب التحويل'
const transferStatuses = {};
const regStatuses = {};

let colW_sum = 0;
let colX_sum = 0;
let colX_approved_sum = 0;
let colX_rejected_sum = 0;
let colW_approved_sum = 0;
let colW_rejected_sum = 0;

rows.forEach(r => {
  const transStatus = r['حاله طلب التحويل'] ? String(r['حاله طلب التحويل']).trim() : 'EMPTY';
  transferStatuses[transStatus] = (transferStatuses[transStatus] || 0) + 1;

  const regStatus = r['حاله التسجيل'] ? String(r['حاله التسجيل']).trim() : 'EMPTY';
  regStatuses[regStatus] = (regStatuses[regStatus] || 0) + 1;

  const req = Number(r['Requested amount']) || 0;
  const act = Number(r['مبلغ التحويل الفعلي']) || 0;

  colW_sum += req;
  colX_sum += act;

  if (transStatus === 'مرفوض') {
    colX_rejected_sum += act;
    colW_rejected_sum += req;
  } else {
    colX_approved_sum += act;
    colW_approved_sum += req;
  }
});

console.log('Transfer Statuses (Col Y):', transferStatuses);
console.log('Registration Statuses (Col V):', regStatuses);
console.log('Total Col W (Requested):', colW_sum);
console.log('Total Col X (Actual):', colX_sum);
console.log('Col X Approved:', colX_approved_sum);
console.log('Col X Rejected:', colX_rejected_sum);
console.log('Col W Approved:', colW_approved_sum);
console.log('Col W Rejected:', colW_rejected_sum);

// Check if any numbers match 98,000 or close to 98k
console.log('\nDifferences:');
console.log('colX_rejected_sum:', colX_rejected_sum);
console.log('colW_rejected_sum:', colW_rejected_sum);
