import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (1).xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

console.log('Total rows:', rows.length);

// Check difference between Total expenses (Col C) and the sum of items
const diffs = [];

rows.forEach((r, idx) => {
  if (!r['Agent Name']) return;
  if (r['Total expenses'] == null && r['expenses Markt-1'] == null && r['Personal expenses'] == null) return;

  const totalExp = Number(r['Total expenses']) || 0;
  const m1 = Number(r['expenses Markt-1']) || 0;
  const m2 = Number(r['expenses Markt-2']) || 0;
  const m3 = Number(r['expenses Markt-3']) || 0;
  const m4 = Number(r['expenses Markt-4']) || 0;
  const m5 = Number(r['expenses Markt-5']) || 0;
  const m6 = Number(r['expenses Markt-6']) || 0;
  const personal = Number(r['Personal expenses']) || 0;

  let transSum = 0;
  for (let i = 1; i <= 5; i++) {
    const monyKey = i === 1 ? 'Recipient Mony' : `Recipient Mony ${i}`;
    if (r[monyKey]) transSum += Number(r[monyKey]) || 0;
  }

  const itemsSumWithTrans = m1 + m2 + m3 + m4 + m5 + m6 + personal + transSum;
  const diffWithTrans = totalExp - itemsSumWithTrans;

  const itemsSumNoTrans = m1 + m2 + m3 + m4 + m5 + m6 + personal;
  const diffNoTrans = totalExp - itemsSumNoTrans;

  if (Math.abs(diffWithTrans) > 0.01) {
    diffs.push({
      rowIdx: idx + 2,
      agent: r['Agent Name'],
      date: r.date,
      totalExp,
      itemsSumWithTrans,
      diffWithTrans,
      transSum,
      itemsSumNoTrans,
      diffNoTrans,
      raw: {
        total: r['Total expenses'],
        m1: r['expenses Markt-1'],
        personal: r['Personal expenses'],
        recMony: r['Recipient Mony'],
        recName: r['Recipient Name']
      }
    });
  }
});

console.log('Rows where Total expenses != sum(items + transfers):', diffs.length);
if (diffs.length > 0) {
  console.log('Sample differences:');
  diffs.slice(0, 20).forEach(d => {
    console.log(`Row ${d.rowIdx} | Agent: ${d.agent} | Total: ${d.totalExp} | Items+Trans: ${d.itemsSumWithTrans} | Diff: ${d.diffWithTrans} | TransSum: ${d.transSum}`);
  });
}
