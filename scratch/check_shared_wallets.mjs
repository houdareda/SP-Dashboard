import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

function cleanPhone(raw) {
  let p = String(raw).trim();
  if (p.startsWith('20')) p = '0' + p.slice(2);
  else if (!p.startsWith('0')) p = '0' + p;
  return p;
}

const phoneAgents = {}; // phone -> Set of agents

rows.forEach(r => {
  const agent = r['Agent Name'];
  const wallet = r['Number Wallet'];
  if (!agent || !wallet) return;
  const phone = cleanPhone(wallet);
  if (phone.length >= 10 && phone.length <= 12) {
    if (!phoneAgents[phone]) phoneAgents[phone] = new Set();
    phoneAgents[phone].add(String(agent).trim());
  }
});

const sharedPhones = {};
for (const [phone, agents] of Object.entries(phoneAgents)) {
  if (agents.size > 1) {
    sharedPhones[phone] = Array.from(agents);
  }
}

console.log('Total unique phones:', Object.keys(phoneAgents).length);
console.log('Shared phones count:', Object.keys(sharedPhones).length);
console.log('Shared phones details:', sharedPhones);
