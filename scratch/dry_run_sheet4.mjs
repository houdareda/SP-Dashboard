import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws);

const agentsMap = JSON.parse(fs.readFileSync(path.resolve('scratch/agents_map.json'), 'utf-8'));
const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

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

let expCount = 0;
let fundsCount = 0;
let transCount = 0;
let expSum = 0;
let fundsApprovedSum = 0;
let transSum = 0;
let canceledRows = 0;

rows.forEach((r, idx) => {
  if (!r['Agent Name']) return;
  const cancelStatus = r['حاله التسجيل'] ? String(r['حاله التسجيل']).trim() : '';
  if (cancelStatus === 'طلب ملغي') {
    canceledRows++;
    return;
  }

  const dateStr = parseRowDate(r);
  if (!dateStr) return;

  // Expenses
  const hasExpenses = r['Total expenses'] != null || r['expenses Markt-1'] != null || r['Personal expenses'] != null;
  if (hasExpenses) {
    expCount++;
    const m1 = Number(r['expenses Markt-1']) || 0;
    const m2 = Number(r['expenses Markt-2']) || 0;
    const m3 = Number(r['expenses Markt-3']) || 0;
    const m4 = Number(r['expenses Markt-4']) || 0;
    const m5 = Number(r['expenses Markt-5']) || 0;
    const m6 = Number(r['expenses Markt-6']) || 0;
    const pers = Number(r['Personal expenses']) || 0;

    let rowTrans = 0;
    for (let i = 1; i <= 5; i++) {
      const nameKey = i === 1 ? 'Recipient Name' : `Recipient Name ${i}`;
      const monyKey = i === 1 ? 'Recipient Mony' : `Recipient Mony ${i}`;
      const recName = r[nameKey];
      const recMony = Number(r[monyKey]) || 0;
      if (recName && recMony > 0) {
        const recObj = agentsMap[normalize(recName)];
        if (recObj) {
          rowTrans += recMony;
          transCount++;
          transSum += recMony;
        }
      }
    }

    const rowTotal = m1 + m2 + m3 + m4 + m5 + m6 + pers + rowTrans;
    expSum += rowTotal;
  }

  // Funds
  const hasFunds = r['Requested amount'] != null || r['مبلغ التحويل الفعلي'] != null || r['حاله طلب التحويل'] != null;
  if (hasFunds) {
    fundsCount++;
    const transStatus = r['حاله طلب التحويل'] ? String(r['حاله طلب التحويل']).trim() : '';
    if (transStatus === 'تم التحويل') {
      fundsApprovedSum += Number(r['Requested amount']) || 0;
    } else if (transStatus === 'تم التحويل بمبلغ مختلف') {
      fundsApprovedSum += Number(r['مبلغ التحويل الفعلي']) || 0;
    }
  }
});

console.log('--- DRY RUN ON Untitled spreadsheet (4).xlsx ---');
console.log('Canceled rows skipped (طلب ملغي):', canceledRows);
console.log('Valid Expenses rows:', expCount, '| Total Expenses Sum:', expSum.toLocaleString(), 'EGP');
console.log('Valid Transfers count:', transCount, '| Total Transfers Sum:', transSum.toLocaleString(), 'EGP');
console.log('Valid Fund Requests count:', fundsCount, '| Total Approved Funds Sum:', fundsApprovedSum.toLocaleString(), 'EGP');
console.log('Total Approved Funds - Pure Expenses:', (fundsApprovedSum - (expSum - transSum)).toLocaleString(), 'EGP');
