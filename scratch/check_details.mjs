import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

let bothCount = 0;
let onlyExpCount = 0;
let onlyFundCount = 0;
let neitherCount = 0;

rows.forEach(r => {
  const hasExp = r['Total expenses'] != null || r['expenses Markt-1'] != null || r['Personal expenses'] != null;
  const hasFund = r['Requested amount'] != null || r['مبلغ التحويل الفعلي'] != null || r['حاله طلب التحويل'] != null;

  if (hasExp && hasFund) bothCount++;
  else if (hasExp) onlyExpCount++;
  else if (hasFund) onlyFundCount++;
  else neitherCount++;
});

console.log('Both Exp and Fund in same row:', bothCount);
console.log('Only Expense:', onlyExpCount);
console.log('Only Fund:', onlyFundCount);
console.log('Neither:', neitherCount);

// Check formId vs type
const formTypeMap = {};
rows.forEach(r => {
  const form = r['formId'] || 'NO_FORM';
  if (!formTypeMap[form]) formTypeMap[form] = { total: 0, withExp: 0, withFund: 0, withBoth: 0 };
  formTypeMap[form].total++;
  const hasExp = r['Total expenses'] != null;
  const hasFund = r['Requested amount'] != null || r['مبلغ التحويل الفعلي'] != null;
  if (hasExp && hasFund) formTypeMap[form].withBoth++;
  else if (hasExp) formTypeMap[form].withExp++;
  else if (hasFund) formTypeMap[form].withFund++;
});
console.log('Form breakdown:', formTypeMap);

// Check wallets
const wallets = new Set();
rows.forEach(r => {
  if (r['Number Wallet']) wallets.add(String(r['Number Wallet']).trim());
});
console.log('Unique Wallets in sheet:', Array.from(wallets));
