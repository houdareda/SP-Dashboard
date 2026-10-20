import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws);

const agentsMap = JSON.parse(fs.readFileSync(path.resolve('scratch/agents_map.json'), 'utf-8'));
const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

const missingAgents = new Set();
const missingRecipients = new Set();

rows.forEach((r, idx) => {
  const cancelStatus = r['حاله التسجيل'] ? String(r['حاله التسجيل']).trim() : '';
  if (cancelStatus === 'طلب ملغي') return;

  const rawAgent = r['Agent Name'];
  if (rawAgent) {
    const norm = normalize(rawAgent);
    if (!agentsMap[norm]) {
      missingAgents.add(rawAgent);
    }
  }

  for (let i = 1; i <= 5; i++) {
    const nameKey = i === 1 ? 'Recipient Name' : `Recipient Name ${i}`;
    const monyKey = i === 1 ? 'Recipient Mony' : `Recipient Mony ${i}`;
    const recName = r[nameKey];
    const recMony = Number(r[monyKey]) || 0;
    if (recName && recMony > 0) {
      const recNorm = normalize(recName);
      if (!agentsMap[recNorm]) {
        missingRecipients.add(recName);
      }
    }
  }
});

console.log('Missing agent names in Sheet 4:', Array.from(missingAgents));
console.log('Missing recipient names in Sheet 4:', Array.from(missingRecipients));
