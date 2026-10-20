import xlsx from 'xlsx';
import path from 'path';

const oldFile = path.resolve('Untitled spreadsheet.xlsx');
const newFile = path.resolve('Untitled spreadsheet (1).xlsx');

const oldWb = xlsx.readFile(oldFile);
const newWb = xlsx.readFile(newFile);

const oldData = xlsx.utils.sheet_to_json(oldWb.Sheets[oldWb.SheetNames[0]], { header: 1 });
const newData = xlsx.utils.sheet_to_json(newWb.Sheets[newWb.SheetNames[0]], { header: 1 });

console.log('Old sheet rows:', oldData.length);
console.log('New sheet rows:', newData.length);

const oldAgents = new Set();
for (let i = 1; i < oldData.length; i++) {
  if (oldData[i] && oldData[i][1]) oldAgents.add(String(oldData[i][1]).trim());
}

const newAgents = new Set();
for (let i = 1; i < newData.length; i++) {
  if (newData[i] && newData[i][1]) newAgents.add(String(newData[i][1]).trim());
}

console.log('Old agents count:', oldAgents.size);
console.log('New agents count:', newAgents.size);

const addedAgents = Array.from(newAgents).filter(a => !oldAgents.has(a));
const removedAgents = Array.from(oldAgents).filter(a => !newAgents.has(a));
console.log('Added agents in Col 1:', addedAgents);
console.log('Removed agents in Col 1:', removedAgents);

// Check recipient names in new sheet
const recipientNames = new Set();
for (let i = 1; i < newData.length; i++) {
  const row = newData[i];
  if (!row) continue;
  for (const idx of [10, 12, 14, 16, 18]) {
    if (row[idx]) recipientNames.add(String(row[idx]).trim());
  }
}
console.log('All recipient names in new sheet:', Array.from(recipientNames));

// Compare totals
let oldExpSum = 0, oldActFundSum = 0, oldReqFundSum = 0;
for (let i = 1; i < oldData.length; i++) {
  const r = oldData[i];
  if (r[2] !== undefined && r[2] !== '') oldExpSum += parseFloat(r[2]) || 0;
  if (r[22] !== undefined && r[22] !== '') oldReqFundSum += parseFloat(r[22]) || 0;
  if (r[23] !== undefined && r[23] !== '') oldActFundSum += parseFloat(r[23]) || 0;
}

let newExpSum = 0, newActFundSum = 0, newReqFundSum = 0;
for (let i = 1; i < newData.length; i++) {
  const r = newData[i];
  if (r[2] !== undefined && r[2] !== '') newExpSum += parseFloat(r[2]) || 0;
  if (r[22] !== undefined && r[22] !== '') newReqFundSum += parseFloat(r[22]) || 0;
  if (r[23] !== undefined && r[23] !== '') newActFundSum += parseFloat(r[23]) || 0;
}

console.log('Old Total Expenses:', oldExpSum);
console.log('New Total Expenses:', newExpSum);
console.log('Difference Expenses:', newExpSum - oldExpSum);

console.log('Old Actual Funds (Col X):', oldActFundSum);
console.log('New Actual Funds (Col X):', newActFundSum);
console.log('Difference Actual Funds:', newActFundSum - oldActFundSum);

console.log('Old Requested Funds (Col W):', oldReqFundSum);
console.log('New Requested Funds (Col W):', newReqFundSum);
console.log('Difference Requested Funds:', newReqFundSum - oldReqFundSum);
