import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws);

const perAgentM5 = {};
const perAgentM6 = {};

rows.forEach(r => {
  const agent = r['Agent Name'];
  if (!agent) return;
  const m5 = Number(r['expenses Markt-5']) || 0;
  const m6 = Number(r['expenses Markt-6']) || 0;
  if (m5 > 0) perAgentM5[agent] = (perAgentM5[agent] || 0) + m5;
  if (m6 > 0) perAgentM6[agent] = (perAgentM6[agent] || 0) + m6;
});

console.log('Marketing 5 per agent:', perAgentM5);
console.log('Marketing 6 per agent:', perAgentM6);
