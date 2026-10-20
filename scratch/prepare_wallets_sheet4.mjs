import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws);

const agentsMap = JSON.parse(fs.readFileSync(path.resolve('scratch/agents_map.json'), 'utf-8'));
const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

function cleanPhone(raw) {
  if (!raw) return null;
  let p = String(raw).trim();
  if (p.includes('e+') || p.includes('E+')) {
    p = String(Number(p));
  }
  if (p.startsWith('20')) p = '0' + p.slice(2);
  else if (!p.startsWith('0')) p = '0' + p;
  return p;
}

const phoneCounts = {};

rows.forEach(r => {
  const cancelStatus = r['حاله التسجيل'] ? String(r['حاله التسجيل']).trim() : '';
  if (cancelStatus === 'طلب ملغي') return;

  const rawAgent = r['Agent Name'];
  const rawWallet = r['Number Wallet'];
  if (!rawAgent || !rawWallet) return;

  const norm = normalize(rawAgent);
  const agentObj = agentsMap[norm];
  if (!agentObj) return;

  const phone = cleanPhone(rawWallet);
  if (phone && phone.length >= 10 && phone.length <= 12) {
    if (!phoneCounts[phone]) phoneCounts[phone] = {};
    phoneCounts[phone][agentObj.id] = (phoneCounts[phone][agentObj.id] || 0) + 1;
  }
});

const uniquePhones = Object.keys(phoneCounts);
console.log('Unique phone numbers found in Sheet 4:', uniquePhones.length);
console.log('Sample phones:', uniquePhones.slice(0, 10));
