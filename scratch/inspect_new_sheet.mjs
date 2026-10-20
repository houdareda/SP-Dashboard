import xlsx from 'xlsx';
import path from 'path';

const file = path.resolve('Untitled spreadsheet (1).xlsx');
const wb = xlsx.readFile(file);
console.log('Sheet names:', wb.SheetNames);

const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
console.log('Total rows:', data.length);
console.log('Header row (row 0):', data[0]);

// Find unique agents
const agents = new Set();
for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (row && row[2]) {
    agents.add(String(row[2]).trim());
  }
}
console.log('Unique agents in Col C:', Array.from(agents));
console.log('Unique agents count:', agents.size);
