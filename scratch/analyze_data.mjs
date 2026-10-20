import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

console.log('Total JSON rows:', rows.length);

// Check column distribution
let hasExpenses = 0;
let hasRequestedAmount = 0;
let hasActualTransfer = 0;
let hasTransfersToRecipients = 0;
const agentNames = new Set();
const formIds = new Set();
const transferStatuses = new Set();
const registrationStatuses = new Set();

rows.forEach((r, idx) => {
  if (r['Agent Name']) agentNames.add(String(r['Agent Name']).trim());
  if (r['formId']) formIds.add(String(r['formId']).trim());
  if (r['حاله طلب التحويل']) transferStatuses.add(String(r['حاله طلب التحويل']).trim());
  if (r['حاله التسجيل']) registrationStatuses.add(String(r['حاله التسجيل']).trim());

  const hasExp = r['Total expenses'] != null || r['expenses Markt-1'] != null || r['Personal expenses'] != null;
  if (hasExp) hasExpenses++;

  if (r['Requested amount'] != null) hasRequestedAmount++;
  if (r['مبلغ التحويل الفعلي'] != null) hasActualTransfer++;

  if (r['Recipient Name'] || r['Recipient Mony'] || r['Recipient Name 2'] || r['Recipient Mony 2']) {
    hasTransfersToRecipients++;
  }
});

console.log('Unique Agent Names in Sheet:', Array.from(agentNames).sort());
console.log('Form IDs:', Array.from(formIds));
console.log('Transfer Statuses:', Array.from(transferStatuses));
console.log('Registration Statuses:', Array.from(registrationStatuses));
console.log('Rows with Expenses:', hasExpenses);
console.log('Rows with Requested Amount:', hasRequestedAmount);
console.log('Rows with Actual Transfer:', hasActualTransfer);
console.log('Rows with Recipient Transfers:', hasTransfersToRecipients);

// Sample rows with expenses
console.log('\n--- Sample Row with Expenses ---');
const expSample = rows.find(r => r['Total expenses'] != null && Number(r['Total expenses']) > 0);
console.log(expSample);

// Sample rows with requested amount / fund transfer
console.log('\n--- Sample Row with Fund Transfer ---');
const fundSample = rows.find(r => r['Requested amount'] != null || r['مبلغ التحويل الفعلي'] != null);
console.log(fundSample);

// Sample row with recipient transfer
console.log('\n--- Sample Row with Recipient Transfer ---');
const recSample = rows.find(r => r['Recipient Name'] != null);
console.log(recSample);
