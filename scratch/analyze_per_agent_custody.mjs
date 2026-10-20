import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (1).xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Group by agent
const agentStats = {};

rows.forEach(r => {
  const agent = r['Agent Name'];
  if (!agent) return;
  const norm = normalize(agent);
  if (!agentStats[norm]) {
    agentStats[norm] = {
      name: agent,
      totalExpensesColC: 0,
      pureExpenses: 0,
      transfersSent: 0,
      transfersReceived: 0,
      colX_fundsApproved: 0,
      colW_fundsRequested: 0,
      fundsApprovedWithFallback: 0,
    };
  }

  // Expenses
  const m1 = Number(r['expenses Markt-1']) || 0;
  const m2 = Number(r['expenses Markt-2']) || 0;
  const m3 = Number(r['expenses Markt-3']) || 0;
  const m4 = Number(r['expenses Markt-4']) || 0;
  const m5 = Number(r['expenses Markt-5']) || 0;
  const m6 = Number(r['expenses Markt-6']) || 0;
  const pers = Number(r['Personal expenses']) || 0;
  const totExp = Number(r['Total expenses']) || (m1 + m2 + m3 + m4 + m5 + m6 + pers);

  agentStats[norm].totalExpensesColC += totExp;
  agentStats[norm].pureExpenses += (m1 + m2 + m3 + m4 + m5 + m6 + pers);

  // Transfers sent
  for (let i = 1; i <= 5; i++) {
    const nameKey = i === 1 ? 'Recipient Name' : `Recipient Name ${i}`;
    const monyKey = i === 1 ? 'Recipient Mony' : `Recipient Mony ${i}`;
    const recName = r[nameKey];
    const recMony = Number(r[monyKey]) || 0;
    if (recName && recMony > 0) {
      agentStats[norm].transfersSent += recMony;
      const recNorm = normalize(recName);
      if (!agentStats[recNorm]) {
        agentStats[recNorm] = {
          name: recName,
          totalExpensesColC: 0,
          pureExpenses: 0,
          transfersSent: 0,
          transfersReceived: 0,
          colX_fundsApproved: 0,
          colW_fundsRequested: 0,
          fundsApprovedWithFallback: 0,
        };
      }
      agentStats[recNorm].transfersReceived += recMony;
    }
  }

  // Funds
  const req = Number(r['Requested amount']) || 0;
  const act = r['مبلغ التحويل الفعلي'];
  const status = r['حاله طلب التحويل'];

  agentStats[norm].colW_fundsRequested += req;

  if (act != null && act !== '') {
    if (status !== 'مرفوض') {
      agentStats[norm].colX_fundsApproved += Number(act) || 0;
      agentStats[norm].fundsApprovedWithFallback += Number(act) || 0;
    }
  } else {
    // act is null/empty
    if (status !== 'مرفوض' && req > 0) {
      agentStats[norm].fundsApprovedWithFallback += req;
    }
  }
});

console.log('--- PER AGENT CUSTODY BREAKDOWN ---');
let grandTotalCustodyFallback = 0;
let grandTotalCustodyStrictColX = 0;
let grandTotalCustodyColW = 0;

for (const [norm, s] of Object.entries(agentStats)) {
  const custodyFallback = (s.fundsApprovedWithFallback + s.transfersReceived) - (s.pureExpenses + s.transfersSent);
  const custodyStrictColX = (s.colX_fundsApproved + s.transfersReceived) - (s.pureExpenses + s.transfersSent);
  const custodyColW = (s.colW_fundsRequested + s.transfersReceived) - (s.pureExpenses + s.transfersSent);

  grandTotalCustodyFallback += custodyFallback;
  grandTotalCustodyStrictColX += custodyStrictColX;
  grandTotalCustodyColW += custodyColW;

  console.log(`${s.name.padEnd(20)} | Custody(ColX+Fallback): ${custodyFallback.toLocaleString().padStart(10)} | Custody(StrictColX): ${custodyStrictColX.toLocaleString().padStart(10)} | Diff: ${(custodyFallback - custodyStrictColX).toLocaleString()}`);
}

console.log('\n--- GRAND TOTALS ---');
console.log('Grand Total Custody (Fallback Col W if Col X empty):', grandTotalCustodyFallback.toLocaleString(), 'EGP');
console.log('Grand Total Custody (Strict Col X only):', grandTotalCustodyStrictColX.toLocaleString(), 'EGP');
console.log('Difference (Fallback - Strict):', (grandTotalCustodyFallback - grandTotalCustodyStrictColX).toLocaleString(), 'EGP');
