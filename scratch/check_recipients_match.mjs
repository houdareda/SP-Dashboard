import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

const agentsMap = JSON.parse(fs.readFileSync(path.resolve('scratch/agents_map.json'), 'utf-8'));
const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

let matchedTransfers = 0;
let unmatchedTransfers = 0;
const unmatchedRecipients = new Set();

rows.forEach((r, idx) => {
  for (let i = 1; i <= 5; i++) {
    const nameKey = i === 1 ? 'Recipient Name' : `Recipient Name ${i}`;
    const monyKey = i === 1 ? 'Recipient Mony' : `Recipient Mony ${i}`;
    const recName = r[nameKey];
    const recMony = r[monyKey];

    if (recName && recMony && Number(recMony) > 0) {
      const norm = normalize(recName);
      if (agentsMap[norm]) {
        matchedTransfers++;
      } else {
        unmatchedTransfers++;
        unmatchedRecipients.add(recName);
      }
    }
  }
});

console.log('Matched recipient transfers:', matchedTransfers);
console.log('Unmatched recipient transfers:', unmatchedTransfers);
console.log('Unmatched recipient names:', Array.from(unmatchedRecipients));
