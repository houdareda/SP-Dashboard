import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const newFile = path.resolve('Untitled spreadsheet (1).xlsx');
const wb = xlsx.readFile(newFile);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

console.log('Total rows:', rows.length);
console.log('Header:', rows[0]);

const agents = new Set();
const recipients = new Set();
const wallets = new Set();
let expensesCount = 0;
let expensesTotal = 0;
let fundsCount = 0;
let fundsActualTotal = 0;
let fundsRequestedTotal = 0;
let transfersCount = 0;
let transfersTotal = 0;

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r) continue;

  const agentName = r[1] ? String(r[1]).trim() : null;
  if (agentName) agents.add(agentName);

  // Check expense
  const expAmt = r[2] !== undefined && r[2] !== '' ? parseFloat(r[2]) : null;
  const regStatus = r[21] ? String(r[21]).trim() : '';

  if (expAmt !== null && !isNaN(expAmt)) {
    expensesCount++;
    expensesTotal += expAmt;

    // Check recipients
    for (const [nameIdx, amtIdx] of [[10, 11], [12, 13], [14, 15], [16, 17], [18, 19]]) {
      const recName = r[nameIdx] ? String(r[nameIdx]).trim() : null;
      const recAmt = r[amtIdx] !== undefined && r[amtIdx] !== '' ? parseFloat(r[amtIdx]) : null;
      if (recName && recAmt !== null && !isNaN(recAmt) && recAmt > 0) {
        recipients.add(recName);
        transfersCount++;
        transfersTotal += recAmt;
      }
    }
  }

  // Check wallet & fund
  const walletNum = r[20] ? String(r[20]).trim() : null;
  if (walletNum) wallets.add(walletNum);

  const actFund = r[23] !== undefined && r[23] !== '' ? parseFloat(r[23]) : null;
  const reqFund = r[22] !== undefined && r[22] !== '' ? parseFloat(r[22]) : null;

  if (actFund !== null && !isNaN(actFund)) {
    fundsCount++;
    fundsActualTotal += actFund;
    if (reqFund !== null && !isNaN(reqFund)) fundsRequestedTotal += reqFund;
  }
}

console.log('\n--- SHEET SUMMARY ---');
console.log('Unique Agent Names (Col B):', Array.from(agents));
console.log('Unique Agents Count:', agents.size);
console.log('Unique Recipients:', Array.from(recipients));
console.log('Unique Wallets Count:', wallets.size);
console.log('Expenses Rows Count:', expensesCount, 'Total Expenses Sum:', expensesTotal.toLocaleString('en-US'), 'EGP');
console.log('Peer Transfers Count:', transfersCount, 'Total Peer Transfers Sum:', transfersTotal.toLocaleString('en-US'), 'EGP');
console.log('Fund Requests Count:', fundsCount, 'Total Actual Funds (Col X):', fundsActualTotal.toLocaleString('en-US'), 'EGP');
console.log('Total Requested Funds (Col W):', fundsRequestedTotal.toLocaleString('en-US'), 'EGP');

// Check agents vs existing agents_map.json
if (fs.existsSync(path.resolve('scratch/agents_map.json'))) {
  const existingMap = JSON.parse(fs.readFileSync(path.resolve('scratch/agents_map.json'), 'utf-8'));
  console.log('\nExisting agents in DB map:', Object.keys(existingMap).length);
  const missingInDb = Array.from(agents).filter(a => !existingMap[a]);
  const missingRecipientsInDb = Array.from(recipients).filter(r => !existingMap[r]);
  console.log('Agents in sheet not in DB map:', missingInDb);
  console.log('Recipients in sheet not in DB map:', missingRecipientsInDb);
}
