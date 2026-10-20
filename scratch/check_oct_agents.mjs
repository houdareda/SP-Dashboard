import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (1).xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Check October 2026 per agent
function parseRowDate(r) {
  if (r.date === 42095 && r['تاريخ يدوي'] === '22/5') return '2026-05-22';
  if (typeof r.date === 'number') {
    const p = xlsx.SSF.parse_date_code(r.date);
    if (p && p.y && p.m && p.d) {
      return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
    }
  }
  return null;
}

const octAgents = {};
rows.forEach((r, idx) => {
  const d = parseRowDate(r);
  if (!d || !d.startsWith('2026-10')) return;
  const agent = r['Agent Name'];
  if (!agent) return;
  const norm = normalize(agent);
  if (!octAgents[norm]) {
    octAgents[norm] = {
      name: agent,
      totalExpSum: 0,
      pureExpSum: 0,
      transSum: 0,
      count: 0
    };
  }

  const tot = Number(r['Total expenses']) || 0;
  const m1 = Number(r['expenses Markt-1']) || 0;
  const m2 = Number(r['expenses Markt-2']) || 0;
  const m3 = Number(r['expenses Markt-3']) || 0;
  const m4 = Number(r['expenses Markt-4']) || 0;
  const m5 = Number(r['expenses Markt-5']) || 0;
  const m6 = Number(r['expenses Markt-6']) || 0;
  const pers = Number(r['Personal expenses']) || 0;

  let trans = 0;
  for (let i = 1; i <= 5; i++) {
    const k = i === 1 ? 'Recipient Mony' : `Recipient Mony ${i}`;
    trans += Number(r[k]) || 0;
  }

  octAgents[norm].totalExpSum += tot;
  octAgents[norm].pureExpSum += (m1 + m2 + m3 + m4 + m5 + m6 + pers);
  octAgents[norm].transSum += trans;
  octAgents[norm].count++;
});

console.log('October 2026 Agents breakdown:');
for (const [k, v] of Object.entries(octAgents)) {
  const diff = v.totalExpSum - (v.pureExpSum + v.transSum);
  console.log(`${v.name.padEnd(20)} | Reports: ${String(v.count).padStart(2)} | TotalExp: ${v.totalExpSum.toLocaleString().padStart(9)} | PureExp: ${v.pureExpSum.toLocaleString().padStart(9)} | Trans: ${v.transSum.toLocaleString().padStart(7)} | Diff: ${diff}`);
}
