import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (1).xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

// Let's check all row differences, rejected amounts, etc.
// Are there rows where status was 'مرفوض' but amount was ~98,000?
// Or rows added in the new sheet?
// Let's find rows with amounts around 98,000
const matches = [];

rows.forEach((r, idx) => {
  const req = Number(r['Requested amount']) || 0;
  const act = Number(r['مبلغ التحويل الفعلي']) || 0;
  const exp = Number(r['Total expenses']) || 0;

  if (Math.abs(req - 98000) <= 2000) matches.push({ type: 'req', row: idx + 2, val: req, agent: r['Agent Name'], status: r['حاله طلب التحويل'] });
  if (Math.abs(act - 98000) <= 2000) matches.push({ type: 'act', row: idx + 2, val: act, agent: r['Agent Name'], status: r['حاله طلب التحويل'] });
  if (Math.abs(exp - 98000) <= 2000) matches.push({ type: 'exp', row: idx + 2, val: exp, agent: r['Agent Name'], status: r['حاله طلب التحويل'] });
});

console.log('Matches near 98,000 in rows:');
matches.forEach(m => console.log(m));

// What about sums of rejected requests for specific agents?
const rejectedByAgent = {};
rows.forEach(r => {
  if (r['حاله طلب التحويل'] === 'مرفوض') {
    const ag = r['Agent Name'];
    const amt = Number(r['Requested amount']) || 0;
    rejectedByAgent[ag] = (rejectedByAgent[ag] || 0) + amt;
  }
});
console.log('\nRejected amounts by agent:', rejectedByAgent);

// What about difference between Col W and Col X by agent?
const diffWXByAgent = {};
rows.forEach(r => {
  const ag = r['Agent Name'];
  const req = Number(r['Requested amount']) || 0;
  const act = Number(r['مبلغ التحويل الفعلي']) || 0;
  if (r['حاله طلب التحويل'] !== 'مرفوض') {
    diffWXByAgent[ag] = (diffWXByAgent[ag] || 0) + (req - act);
  }
});
console.log('\nDiff (Col W - Col X) on approved by agent:', diffWXByAgent);
